import apiClient from './client';
import type { ApiResponse } from '../types/auth';
import type { PoiCategoryOption, PoiDetail, PoiReviewPayload, PoiSummary, PoiUpsertPayload } from '../types/poi';

export async function fetchPoiCategories() {
  const response = await apiClient.get<ApiResponse<Array<{ itemCode: string; itemName: string }>>>('/api/v1/poi-categories');
  return response.data.data.map((item) => ({ code: item.itemCode, name: item.itemName }));
}

export async function fetchReviewIssues() {
  const response = await apiClient.get<ApiResponse<Array<{ itemCode: string; itemName: string }>>>('/api/v1/review-issues');
  return response.data.data.map((item) => ({ code: item.itemCode, name: item.itemName }));
}

export async function createPoi(payload: PoiUpsertPayload) {
  const response = await apiClient.post<ApiResponse<PoiDetail>>('/api/v1/collector/pois', payload);
  return response.data.data;
}

export async function updatePoi(poiId: number, payload: PoiUpsertPayload) {
  const response = await apiClient.put<ApiResponse<PoiDetail>>(`/api/v1/collector/pois/${poiId}`, payload);
  return response.data.data;
}

export async function fetchMyPois() {
  const response = await apiClient.get<ApiResponse<PoiSummary[]>>('/api/v1/collector/pois');
  return response.data.data;
}

export async function fetchMyPoiDetail(poiId: number) {
  const response = await apiClient.get<ApiResponse<PoiDetail>>(`/api/v1/collector/pois/${poiId}`);
  return response.data.data;
}

export async function fetchVerifierPendingPois() {
  const response = await apiClient.get<ApiResponse<PoiSummary[]>>('/api/v1/verifier/pois/pending');
  return response.data.data;
}

export async function fetchVerifierPoiDetail(poiId: number) {
  const response = await apiClient.get<ApiResponse<PoiDetail>>(`/api/v1/verifier/pois/${poiId}`);
  return response.data.data;
}

export async function submitVerifierPoiReview(poiId: number, payload: PoiReviewPayload) {
  const response = await apiClient.post<ApiResponse<PoiDetail>>(`/api/v1/verifier/pois/${poiId}/review`, payload);
  return response.data.data;
}
