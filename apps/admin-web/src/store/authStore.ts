import { create } from 'zustand';
import type { UserProfile } from '../types/auth';

type AuthState = {
  token: string | null;
  user: UserProfile | null;
  setAuth: (payload: { token: string; user: UserProfile }) => void;
  logout: () => void;
};

const TOKEN_KEY = 'poi_admin_token';
const USER_KEY = 'poi_admin_user';

function readInitialState() {
  if (typeof window === 'undefined') {
    return { token: null, user: null };
  }

  const rawUser = window.localStorage.getItem(USER_KEY);
  return {
    token: window.localStorage.getItem(TOKEN_KEY),
    user: rawUser ? JSON.parse(rawUser) : null,
  };
}

export const useAuthStore = create<AuthState>((set) => ({
  ...readInitialState(),
  setAuth: ({ token, user }) => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(TOKEN_KEY, token);
      window.localStorage.setItem(USER_KEY, JSON.stringify(user));
    }
    set({ token, user });
  },
  logout: () => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(TOKEN_KEY);
      window.localStorage.removeItem(USER_KEY);
    }
    set({ token: null, user: null });
  },
}));
