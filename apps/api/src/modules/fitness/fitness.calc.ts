export interface SetLike {
  weight: number | null;
  reps: number | null;
  completed: boolean;
}

/** Training volume: Σ weight × reps over completed sets. */
export function workoutVolume(sets: SetLike[]): number {
  return sets.reduce((sum, set) => (set.completed ? sum + (set.weight ?? 0) * (set.reps ?? 0) : sum), 0);
}

/** Epley estimated one-rep max. */
export function estimatedOneRepMax(weight: number, reps: number): number {
  if (reps <= 0 || weight <= 0) return 0;
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30) * 10) / 10;
}
