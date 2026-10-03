import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

interface TimerState {
  goalId: string | null;
  topicId: string | null;
  startedAt: string | null;
  start: (goalId: string, topicId: string | null) => void;
  reset: () => void;
}

/** Study timer, persisted per browser so a reload doesn't lose a running session. */
export const useStudyTimer = create<TimerState>()(
  persist(
    (set) => ({
      goalId: null,
      topicId: null,
      startedAt: null,
      start: (goalId, topicId) => set({ goalId, topicId, startedAt: new Date().toISOString() }),
      reset: () => set({ goalId: null, topicId: null, startedAt: null }),
    }),
    {
      name: "lifeos-study-timer",
      storage: createJSONStorage(() => {
        try {
          return localStorage;
        } catch {
          return sessionStorage;
        }
      }),
    },
  ),
);
