export interface UserProfile {
  id: number;
  username: string;
  realName: string;
  displayName: string;
  avatarUrl: string | null;
  roles: string[];
  permissions: string[];
  wechatBound: boolean;
  wechatNickname: string | null;
  wechatBoundAt: string | null;
}

export interface LoginResponse {
  accessToken: string;
  tokenType: string;
  expiresInSeconds: number;
  user: UserProfile;
}

export interface ApiResponse<T> {
  code: string;
  message: string;
  data: T;
  requestId: string;
  timestamp: string;
}
