export interface File {
    id: string;
    name: string;
    folderId: string;
    size: number;
    mimeType: string | null;
    createdAt: Date;
    updatedAt: Date;
    isDeleted: boolean;
}
