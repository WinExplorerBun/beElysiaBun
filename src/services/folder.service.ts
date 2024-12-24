import {FolderRepository} from "../repositories/folder.repository";

export class FolderService {
    constructor(private readonly folderRepository: FolderRepository) {}

    async getFolderStructure() {
        return this.folderRepository.getFolderStructure();
    }

    async getFolderContents(folderId: string) {
        return this.folderRepository.getFolderContents(folderId);
    }

    async createFolder(name: string, parentId: string | null) {
        return this.folderRepository.createFolder(name, parentId);
    }

    async renameFolder(id: string, newName: string) {
        return this.folderRepository.renameFolder(id, newName);
    }

    async deleteFolder(id: string) {
        return this.folderRepository.deleteFolder(id);
    }
}