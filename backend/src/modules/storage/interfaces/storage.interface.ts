export const STORAGE_TOKEN = "STORAGE_SERVICE";

export interface UploadResult {
  path: string;
  publicUrl: string | null;
}

export interface StorageService {
  uploadFile(
    bucket: string,
    path: string,
    file: Buffer,
    contentType: string,
  ): Promise<UploadResult>;

  deleteFile(bucket: string, path: string): Promise<void>;

  getSignedUrl(bucket: string, path: string, expiresIn?: number): Promise<string | null>;

  getPublicUrl(bucket: string, path: string): string | null;

  downloadFile(bucket: string, path: string): Promise<Buffer>;
}
