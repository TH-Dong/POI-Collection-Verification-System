import apiClient from './client';
import type { ApiResponse } from '../types/auth';
import type { MobileWorkbench, NoticeItem, TaskItem, TaskStatus } from '../types/operations';

export async function fetchMobileWorkbench() {
  const response = await apiClient.get<ApiResponse<MobileWorkbench>>('/api/v1/mobile/workbench');
  return response.data.data;
}

export async function fetchMyTasks() {
  const response = await apiClient.get<ApiResponse<TaskItem[]>>('/api/v1/tasks/me');
  return response.data.data;
}

export async function updateTaskStatus(taskId: number, status: TaskStatus) {
  const response = await apiClient.put<ApiResponse<TaskItem>>(`/api/v1/tasks/${taskId}/status`, { status });
  return response.data.data;
}

export async function fetchMyNotices() {
  const response = await apiClient.get<ApiResponse<NoticeItem[]>>('/api/v1/notices');
  return response.data.data;
}

export async function markNoticeRead(noticeUserId: number) {
  const response = await apiClient.put<ApiResponse<null>>(`/api/v1/notices/${noticeUserId}/read`);
  return response.data.data;
}
