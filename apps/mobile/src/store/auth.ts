import { create } from "zustand";
import type { SupabaseUser } from "@/types/api";

interface AuthState {
  user: SupabaseUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  hydrated: boolean;
  setAuth: (user: SupabaseUser, accessToken: string, refreshToken: string) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  signOut: () => void;
  markHydrated: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  hydrated: false,
  setAuth: (user, accessToken, refreshToken) =>
    set({ user, accessToken, refreshToken, hydrated: true }),
  setTokens: (accessToken, refreshToken) => set({ accessToken, refreshToken }),
  signOut: () => set({ user: null, accessToken: null, refreshToken: null }),
  markHydrated: () => set({ hydrated: true }),
}));
