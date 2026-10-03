"use client";

import { api } from "@/lib/api";
import { useApiMutation } from "./use-api";

/** Completion toggles shared by Dashboard, Today, Routine, Habits and Tasks. */
export function useToggleRoutineItem() {
  return useApiMutation(
    ({ itemId, date, completed }: { itemId: string; date: string; completed: boolean }) =>
      api(`/routines/items/${itemId}/log`, { method: "POST", body: { date, status: completed ? "COMPLETED" : "PENDING" } }),
    { invalidate: [["routine"]] },
  );
}

export function useToggleHabit() {
  return useApiMutation(
    ({ habitId, date, completed, value }: { habitId: string; date: string; completed: boolean; value?: number }) =>
      api(`/habits/${habitId}/log`, { method: "POST", body: { date, status: completed ? "COMPLETED" : "PENDING", value } }),
    { invalidate: [["habits"]] },
  );
}

export function useSetTaskStatus() {
  return useApiMutation(
    ({ taskId, status }: { taskId: string; status: string }) => api(`/tasks/${taskId}`, { method: "PATCH", body: { status } }),
    { invalidate: [["tasks"], ["projects"]] },
  );
}
