import apiClient from './client';
import type { ApiResponse, LoginResponse, WeChatBinding } from '../types/auth';
import type { MobileWorkbench } from '../types/operations';

export async function login(payload: { username: string; password: string }) {
  const response = await apiClient.post<ApiResponse<LoginResponse>>('/api/v1/auth/login', payload);
  return response.data.data;
}

export async function weChatLogin(payload: { authCode: string }) {
  const response = await apiClient.post<ApiResponse<LoginResponse>>('/api/v1/auth/wechat/login', payload);
  return response.data.data;
}

export async function fetchMobileHome() {
  const response = await apiClient.get<ApiResponse<{ title: string; message: string; roles: string[] }>>('/api/v1/mobile/home');
  return response.data.data;
}

export async function fetchMobileWorkbench() {
  const response = await apiClient.get<ApiResponse<MobileWorkbench>>('/api/v1/mobile/workbench');
  return response.data.data;
}

export async function fetchWeChatBinding() {
  const response = await apiClient.get<ApiResponse<WeChatBinding>>('/api/v1/auth/wechat/binding');
  return response.data.data;
}

export async function bindWeChat(payload: { authCode: string }) {
  const response = await apiClient.post<ApiResponse<WeChatBinding>>('/api/v1/auth/wechat/bind', payload);
  return response.data.data;
}

export async function unbindWeChat() {
  const response = await apiClient.delete<ApiResponse<WeChatBinding>>('/api/v1/auth/wechat/bind');
  return response.data.data;
}
