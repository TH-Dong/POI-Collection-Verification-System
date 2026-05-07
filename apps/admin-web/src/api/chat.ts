import apiClient from './client';
import type { ApiResponse } from '../types/auth';
import type { ChatConversationDetail, ChatConversationSummary, ChatMessage, ChatUnreadSummary } from '../types/chat';

export async function fetchChatConversations() {
  const response = await apiClient.get<ApiResponse<ChatConversationSummary[]>>('/api/v1/chat/conversations');
  return response.data.data;
}

export async function fetchChatUnreadSummary() {
  const response = await apiClient.get<ApiResponse<ChatUnreadSummary>>('/api/v1/chat/unread-count');
  return response.data.data;
}

export async function fetchConversationDetail(conversationId: number) {
  const response = await apiClient.get<ApiResponse<ChatConversationDetail>>(`/api/v1/chat/conversations/${conversationId}`);
  return response.data.data;
}

export async function sendConversationMessage(conversationId: number, content: string) {
  const response = await apiClient.post<ApiResponse<ChatMessage>>(`/api/v1/chat/conversations/${conversationId}/messages`, { content });
  return response.data.data;
}

export async function markConversationRead(conversationId: number) {
  const response = await apiClient.put<ApiResponse<null>>(`/api/v1/chat/conversations/${conversationId}/read`);
  return response.data.data;
}

export async function openPoiPrivateConversation(poiId: number) {
  const response = await apiClient.post<ApiResponse<ChatConversationSummary>>(`/api/v1/chat/pois/${poiId}/private-conversation`);
  return response.data.data;
}

export async function fetchPoiCommunicationMessages(poiId: number) {
  const response = await apiClient.get<ApiResponse<ChatMessage[]>>(`/api/v1/chat/pois/${poiId}/messages`);
  return response.data.data;
}

export function buildChatWebSocketUrl(token: string) {
  const baseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080';
  const wsBaseUrl = baseUrl.replace(/^http/i, 'ws').replace(/\/$/, '');
  return `${wsBaseUrl}/ws/chat?token=${encodeURIComponent(token)}`;
}
