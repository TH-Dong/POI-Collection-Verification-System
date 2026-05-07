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

export interface OcrResult {
  extractedText: string;
  suggestedPoiName: string | null;
  suggestedDescription: string | null;
  suggestedCategoryCode: string | null;
  confidence: number;
  provider: string;
}

export async function uploadFile(asset: { uri: string; name: string; type: string }) {
  const formData = new FormData();
  formData.append('file', {
    uri: asset.uri,
    name: asset.name,
    type: asset.type,
  } as never);

  const response = await apiClient.post<ApiResponse<UploadResult>>('/api/v1/files/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data.data;
}

export async function recognizeImageOcr(asset: { uri: string; name: string; type: string }) {
  const formData = new FormData();
  formData.append('file', {
    uri: asset.uri,
    name: asset.name,
    type: asset.type,
  } as never);

  const response = await apiClient.post<ApiResponse<OcrResult>>('/api/v1/ocr/recognize', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    timeout: 60000,
  });
  return response.data.data;
}
