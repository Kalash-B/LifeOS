import { create } from "zustand";

export interface Toast {
  id: number;
  tone: "success" | "error" | "info";
  message: string;
}

interface ToastState {
  toasts: Toast[];
  push: (tone: Toast["tone"], message: string) => void;
  dismiss: (id: number) => void;
}

let nextId = 1;

export const useToasts = create<ToastState>((set, get) => ({
  toasts: [],
  push: (tone, message) => {
    const id = nextId++;
    set({ toasts: [...get().toasts.slice(-3), { id, tone, message }] });
    setTimeout(() => get().dismiss(id), tone === "error" ? 6000 : 3500);
  },
  dismiss: (id) => set({ toasts: get().toasts.filter((toast) => toast.id !== id) }),
}));

export const toast = {
  success: (message: string) => useToasts.getState().push("success", message),
  error: (message: string) => useToasts.getState().push("error", message),
  info: (message: string) => useToasts.getState().push("info", message),
};
