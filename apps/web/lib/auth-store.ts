import { create } from "zustand";
import type { User } from "@/types/api";

interface AuthState {
  /** Short-lived access token. Kept in memory only — never in localStorage. */
  accessToken: string | null;
  /** Epoch ms when the access token expires. */
  expiresAt: number | null;
  user: User | null;
  setSession: (accessToken: string, user: User, expiresInSeconds: number) => void;
  setUser: (user: User) => void;
  clear: () => void;
}

export const useAuth = create<AuthState>((set) => ({
  accessToken: null,
  expiresAt: null,
  user: null,
  setSession: (accessToken, user, expiresInSeconds) => set({ accessToken, user, expiresAt: Date.now() + expiresInSeconds * 1000 }),
  setUser: (user) => set({ user }),
  clear: () => set({ accessToken: null, user: null, expiresAt: null }),
}));
