import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { swagger } from '@elysiajs/swagger';
import { FolderRepository } from './repositories/folder.repository';
import { FolderService } from './services/folder.service';
import { pool } from './config/database';

const app = new Elysia()
    .use(cors())
    .use(swagger({
        documentation: {
            info: {
                title: 'Windows Explorer API',
                version: '1.0.0',
            },
        },
    }));

const folderRepository = new FolderRepository(pool);
const folderService = new FolderService(folderRepository);

console.log('🚀 Initializing server...');

app.group('/api/v1', app => app
    // Get complete folder structure
    .get('/folders', async ({ set }) => {
        try {
            console.log('📂 Fetching folder structure');
            const folders = await folderService.getFolderStructure();
            return { success: true, data: folders };
        } catch (error) {
            console.error('❌ Error fetching folder structure:', error);
            set.status = 500;
            return { success: false, error: 'Failed to fetch folder structure' };
        }
    })

    // Get contents of a specific folder
    .get('/folders/:id/contents', async ({ params: { id }, set }) => {
        try {
            console.log(`📂 Fetching contents for folder: ${id}`);
            const contents = await folderService.getFolderContents(id);
            return { success: true, data: contents };
        } catch (error) {
            console.error(`❌ Error fetching folder contents for ${id}:`, error);
            set.status = 500;
            return { success: false, error: 'Failed to fetch folder contents' };
        }
    })

    // Create new folder
    .post('/folders', async ({ body, set }) => {
        try {
            const { name, parentId } = body as { name: string; parentId?: string };
            console.log(`📂 Creating new folder: ${name} under parent: ${parentId || 'root'}`);
            const newFolder = await folderService.createFolder(name, parentId || null);
            return { success: true, data: newFolder };
        } catch (error) {
            console.error('❌ Error creating folder:', error);
            set.status = 500;
            return { success: false, error: 'Failed to create folder' };
        }
    })

    // Rename folder
    .patch('/folders/:id', async ({ params: { id }, body, set }) => {
        try {
            const { name } = body as { name: string };
            console.log(`📂 Renaming folder ${id} to: ${name}`);
            const updatedFolder = await folderService.renameFolder(id, name);
            return { success: true, data: updatedFolder };
        } catch (error) {
            console.error(`❌ Error renaming folder ${id}:`, error);
            set.status = 500;
            return { success: false, error: 'Failed to rename folder' };
        }
    })

    // Delete folder
    .delete('/folders/:id', async ({ params: { id }, set }) => {
        try {
            console.log(`🗑️ Deleting folder: ${id}`);
            await folderService.deleteFolder(id);
            return { success: true, message: 'Folder deleted successfully' };
        } catch (error) {
            console.error(`❌ Error deleting folder ${id}:`, error);
            set.status = 500;
            return { success: false, error: 'Failed to delete folder' };
        }
    })
);

app.listen(3000, () => {
    console.log('🚀 Server is running on http://localhost:3000');
    console.log('📚 API documentation available at http://localhost:3000/swagger');
});