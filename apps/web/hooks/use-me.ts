"use client";

import { useApi } from "./use-api";
import type { Me } from "@/types/api";

export function useMe() {
  return useApi<Me>(["me"], "/users/me", { staleTime: 5 * 60_000 });
}

export function useCurrency() {
  return useMe().data?.settings.currency ?? "INR";
}
