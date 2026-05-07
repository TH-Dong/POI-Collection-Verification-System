import apiClient from './client';
import type { ApiResponse } from '../types/auth';

export interface UploadResult {
  objectName: string;
  originalFilename: string;
  contentType: string;
  size: number;
  url: string;
  storageMode: string;
}

export async function uploadFile(file: File) {
  const formData = new FormData();
  formData.append('file', file);
  const response = await apiClient.post<ApiResponse<UploadResult>>('/api/v1/files/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data.data;
}
