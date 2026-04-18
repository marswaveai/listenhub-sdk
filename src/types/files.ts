export interface CreateFileUploadParams {
  fileKey: string;
  contentType: string;
  category: string;
}

export interface CreateFileUploadResponse {
  presignedUrl: string;
  fileUrl: string;
}

export interface GetFileDownloadUrlResponse {
  downloadUrl: string;
}
