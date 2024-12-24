export interface Folder {
    id: string;
    name: string;
    parentId: string | null;
    path: string;
    createdAt: Date;
    updatedAt: Date;
    isDeleted: boolean;
}