"use client";

import { useMutation, useQuery, useQueryClient, type QueryKey, type UseQueryOptions } from "@tanstack/react-query";
import { api, errorMessage } from "@/lib/api";
import { toast } from "@/lib/toast-store";

/** GET helper. The query key's first segment should name the module so mutations can invalidate it. */
export function useApi<T>(key: QueryKey, path: string, options?: Omit<UseQueryOptions<T>, "queryKey" | "queryFn">) {
  return useQuery<T>({ queryKey: key, queryFn: () => api<T>(path), ...options });
}

interface MutationOptions<TResult> {
  /** Query-key prefixes to refetch after success. */
  invalidate?: QueryKey[];
  success?: string;
  onSuccess?: (result: TResult) => void;
}

/** Write helper with toast feedback and cache invalidation. */
export function useApiMutation<TVars, TResult = unknown>(
  fn: (vars: TVars) => Promise<TResult>,
  { invalidate = [], success, onSuccess }: MutationOptions<TResult> = {},
) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: async (result) => {
      // Every write can move cross-module numbers (dashboard, analytics).
      await Promise.all(
        [...invalidate, ["dashboard"], ["analytics"], ["notifications"]].map((queryKey) => client.invalidateQueries({ queryKey })),
      );
      if (success) toast.success(success);
      onSuccess?.(result);
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}
