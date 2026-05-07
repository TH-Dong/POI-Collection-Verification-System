import apiClient from './client';
import type { ApiResponse, LoginResponse, UserProfile } from '../types/auth';

export async function login(payload: { username: string; password: string }) {
  const response = await apiClient.post<ApiResponse<LoginResponse>>('/api/v1/auth/login', payload);
  return response.data.data;
}

export async function fetchCurrentUser() {
  const response = await apiClient.get<ApiResponse<UserProfile>>('/api/v1/auth/me');
  return response.data.data;
}

export async function fetchAdminHome() {
  const response = await apiClient.get<ApiResponse<{ title: string; message: string; roles: string[] }>>('/api/v1/admin/home');
  return response.data.data;
}
