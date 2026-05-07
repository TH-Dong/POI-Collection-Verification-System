import apiClient from './client';
import type { ApiResponse } from '../types/auth';
import type { DisputeDetail, DisputeSummary } from '../types/dispute';
import type { PoiReviewDecision } from '../types/poi';

export async function fetchDisputes() {
  const response = await apiClient.get<ApiResponse<DisputeSummary[]>>('/api/v1/disputes');
  return response.data.data;
}

export async function fetchDisputeDetail(disputeId: string) {
  const response = await apiClient.get<ApiResponse<DisputeDetail>>(`/api/v1/disputes/${disputeId}`);
  return response.data.data;
}

export async function commentDispute(disputeId: string, payload: { content: string }) {
  const response = await apiClient.post<ApiResponse<DisputeDetail>>(`/api/v1/disputes/${disputeId}/comments`, payload);
  return response.data.data;
}

export async function escalateDispute(disputeId: string, payload: { content?: string | null }) {
  const response = await apiClient.post<ApiResponse<DisputeDetail>>(`/api/v1/disputes/${disputeId}/escalate`, payload);
  return response.data.data;
}

export async function arbitrateDispute(disputeId: string, payload: { finalDecision: PoiReviewDecision; description: string }) {
  const response = await apiClient.post<ApiResponse<DisputeDetail>>(`/api/v1/disputes/${disputeId}/arbitrate`, payload);
  return response.data.data;
}
