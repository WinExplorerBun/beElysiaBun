import { Pool } from 'pg';

export class FolderRepository {
    constructor(private readonly pool: Pool) {}

    async getFolderStructure() {
        const query = `
      SELECT id, name, parent_id, path 
      FROM folders 
      WHERE is_deleted = false 
      ORDER BY path
    `;
        const result = await this.pool.query(query);
        return result.rows;
    }

    async getFolderContents(folderId: string) {
        const folderQuery = `
      SELECT id, name, parent_id, path, 'folder' as type 
      FROM folders 
      WHERE parent_id = $1 AND is_deleted = false
    `;

        const fileQuery = `
      SELECT id, name, size, mime_type, 'file' as type 
      FROM files 
      WHERE folder_id = $1 AND is_deleted = false
    `;

        const [folders, files] = await Promise.all([
            this.pool.query(folderQuery, [folderId]),
            this.pool.query(fileQuery, [folderId])
        ]);

        return {
            folders: folders.rows,
            files: files.rows
        };
    }

    async createFolder(name: string, parentId: string | null) {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');

            // Get parent path if parentId exists
            let parentPath = '';
            if (parentId) {
                const parentResult = await client.query(
                    'SELECT path FROM folders WHERE id = $1',
                    [parentId]
                );
                if (parentResult.rows.length === 0) {
                    throw new Error('Parent folder not found');
                }
                parentPath = parentResult.rows[0].path;
            }

            // Create new path
            const path = parentPath ? `${parentPath}/${name}` : name;

            // Insert new folder
            const query = `
        INSERT INTO folders (name, parent_id, path)
        VALUES ($1, $2, $3)
        RETURNING id, name, parent_id, path
      `;
            const result = await client.query(query, [name, parentId, path]);

            await client.query('COMMIT');
            return result.rows[0];
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async renameFolder(id: string, newName: string) {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');

            // Get current folder info
            const folderResult = await client.query(
                'SELECT parent_id, path FROM folders WHERE id = $1',
                [id]
            );
            if (folderResult.rows.length === 0) {
                throw new Error('Folder not found');
            }

            const currentFolder = folderResult.rows[0];
            const oldPath = currentFolder.path;
            const pathParts = oldPath.split('/');
            pathParts[pathParts.length - 1] = newName;
            const newPath = pathParts.join('/');

            // Update folder name and path
            const updateQuery = `
        UPDATE folders
        SET name = $1, path = $2, updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
        RETURNING id, name, parent_id, path
      `;
            const result = await client.query(updateQuery, [newName, newPath, id]);

            // Update paths of all subfolders
            const updateSubfoldersQuery = `
        UPDATE folders
        SET path = regexp_replace(path, '^${oldPath}', '${newPath}')
        WHERE path LIKE '${oldPath}/%'
      `;
            await client.query(updateSubfoldersQuery);

            await client.query('COMMIT');
            return result.rows[0];
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async deleteFolder(id: string) {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');

            // Soft delete the folder and all its subfolders
            const updateQuery = `
        UPDATE folders
        SET is_deleted = true, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1 OR path LIKE (
          SELECT path || '/%'
          FROM folders
          WHERE id = $1
        )
      `;
            await client.query(updateQuery, [id]);

            // Soft delete all files in the folder and subfolders
            const updateFilesQuery = `
        UPDATE files
        SET is_deleted = true, updated_at = CURRENT_TIMESTAMP
        WHERE folder_id IN (
          SELECT id
          FROM folders
          WHERE id = $1 OR path LIKE (
            SELECT path || '/%'
            FROM folders
            WHERE id = $1
          )
        )
      `;
            await client.query(updateFilesQuery, [id]);

            await client.query('COMMIT');
            return true;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }
}