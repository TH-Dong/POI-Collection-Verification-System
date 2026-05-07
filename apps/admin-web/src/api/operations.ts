import apiClient from './client';
import type { ApiResponse } from '../types/auth';
import type {
  AdminDashboard,
  AdminUser,
  BroadcastPayload,
  DictItem,
  DictType,
  DictUpsertPayload,
  LoginLogItem,
  NoticeItem,
  NoticeTemplate,
  OperationLogItem,
  TaskItem,
  TaskStatus,
  TaskUpsertPayload,
  UserUpdatePayload,
  WorkflowRule,
  WorkflowRuleUpdatePayload,
} from '../types/operations';

export async function fetchDashboard() {
  const response = await apiClient.get<ApiResponse<AdminDashboard>>('/api/v1/dashboard');
  return response.data.data;
}

export async function fetchTasks() {
  const response = await apiClient.get<ApiResponse<TaskItem[]>>('/api/v1/admin/tasks');
  return response.data.data;
}

export async function fetchMyTasks() {
  const response = await apiClient.get<ApiResponse<TaskItem[]>>('/api/v1/tasks/me');
  return response.data.data;
}

export async function createTask(payload: TaskUpsertPayload) {
  const response = await apiClient.post<ApiResponse<TaskItem>>('/api/v1/admin/tasks', payload);
  return response.data.data;
}

export async function updateTask(taskId: number, payload: TaskUpsertPayload) {
  const response = await apiClient.put<ApiResponse<TaskItem>>(`/api/v1/admin/tasks/${taskId}`, payload);
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

export async function fetchNoticeHistory() {
  const response = await apiClient.get<ApiResponse<NoticeItem[]>>('/api/v1/admin/notices');
  return response.data.data;
}

export async function broadcastNotice(payload: BroadcastPayload) {
  const response = await apiClient.post<ApiResponse<NoticeItem>>('/api/v1/admin/notices/broadcast', payload);
  return response.data.data;
}

export async function fetchNoticeTemplates() {
  const response = await apiClient.get<ApiResponse<NoticeTemplate[]>>('/api/v1/admin/notice-templates');
  return response.data.data;
}

export async function createNoticeTemplate(payload: Omit<NoticeTemplate, 'id'>) {
  const response = await apiClient.post<ApiResponse<NoticeTemplate>>('/api/v1/admin/notice-templates', payload);
  return response.data.data;
}

export async function updateNoticeTemplate(templateId: number, payload: Omit<NoticeTemplate, 'id'>) {
  const response = await apiClient.put<ApiResponse<NoticeTemplate>>(`/api/v1/admin/notice-templates/${templateId}`, payload);
  return response.data.data;
}

export async function fetchDictionaries(type: DictType) {
  const response = await apiClient.get<ApiResponse<DictItem[]>>('/api/v1/admin/dictionaries', { params: { type } });
  return response.data.data;
}

export async function createDictionary(payload: DictUpsertPayload) {
  const response = await apiClient.post<ApiResponse<DictItem>>('/api/v1/admin/dictionaries', payload);
  return response.data.data;
}

export async function updateDictionary(id: number, payload: DictUpsertPayload) {
  const response = await apiClient.put<ApiResponse<DictItem>>(`/api/v1/admin/dictionaries/${id}`, payload);
  return response.data.data;
}

export async function fetchWorkflowRules() {
  const response = await apiClient.get<ApiResponse<WorkflowRule[]>>('/api/v1/admin/workflow-rules');
  return response.data.data;
}

export async function updateWorkflowRule(id: number, payload: WorkflowRuleUpdatePayload) {
  const response = await apiClient.put<ApiResponse<WorkflowRule>>(`/api/v1/admin/workflow-rules/${id}`, payload);
  return response.data.data;
}

export async function fetchUsers() {
  const response = await apiClient.get<ApiResponse<AdminUser[]>>('/api/v1/admin/users');
  return response.data.data;
}

export async function updateUser(userId: number, payload: UserUpdatePayload) {
  const response = await apiClient.put<ApiResponse<AdminUser>>(`/api/v1/admin/users/${userId}`, payload);
  return response.data.data;
}

export async function fetchOperationLogs() {
  const response = await apiClient.get<ApiResponse<OperationLogItem[]>>('/api/v1/admin/audit/operations');
  return response.data.data;
}

export async function fetchLoginLogs() {
  const response = await apiClient.get<ApiResponse<LoginLogItem[]>>('/api/v1/admin/audit/logins');
  return response.data.data;
}

export async function downloadAdminReport(type: 'pois' | 'audit' | 'users') {
  const response = await apiClient.get(`/api/v1/admin/reports/${type}.csv`, {
    responseType: 'blob',
  });
  return response.data as Blob;
}
