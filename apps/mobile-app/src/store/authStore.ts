import { create } from 'zustand';
import type { UserProfile } from '../types/auth';

type AuthState = {
  token: string | null;
  user: UserProfile | null;
  setAuth: (payload: { token: string; user: UserProfile }) => void;
  setUser: (user: UserProfile) => void;
  logout: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  setAuth: ({ token, user }) => set({ token, user }),
  setUser: (user) => set((state) => ({ ...state, user })),
  logout: () => set({ token: null, user: null }),
}));
