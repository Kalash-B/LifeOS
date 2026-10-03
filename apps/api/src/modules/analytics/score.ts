/**
 * LifeOS score (spec §20) — a transparent productivity visualization, not a
 * judgement of the person. Every component reports its raw value, weight and
 * an explanation. Components without data for the day are excluded and the
 * remaining weights are renormalized, rather than silently counting as zero.
 */

export const SCORE_COMPONENTS = ['routine', 'habits', 'fitness', 'learning', 'projects', 'finance'] as const;
export type ScoreComponent = (typeof SCORE_COMPONENTS)[number];
export type ScoreWeights = Record<ScoreComponent, number>;

export const DEFAULT_SCORE_WEIGHTS: ScoreWeights = {
  routine: 20,
  habits: 20,
  fitness: 15,
  learning: 20,
  projects: 15,
  finance: 10,
};

export interface ComponentInput {
  /** 0..1, or null when there is nothing to measure */
  value: number | null;
  explanation: string;
}

export interface ScoreBreakdownItem {
  component: ScoreComponent;
  value: number | null;
  /** 0–100 */
  score: number | null;
  configuredWeight: number;
  /** Weight actually applied after excluding components without data */
  effectiveWeight: number;
  contribution: number;
  explanation: string;
}

export interface ScoreResult {
  score: number | null;
  breakdown: ScoreBreakdownItem[];
  excluded: ScoreComponent[];
}

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

export function computeScore(inputs: Record<ScoreComponent, ComponentInput>, weights: ScoreWeights = DEFAULT_SCORE_WEIGHTS): ScoreResult {
  const active = SCORE_COMPONENTS.filter((component) => inputs[component].value !== null && weights[component] > 0);
  const activeWeight = active.reduce((sum, component) => sum + weights[component], 0);

  const breakdown = SCORE_COMPONENTS.map((component): ScoreBreakdownItem => {
    const { value, explanation } = inputs[component];
    const isActive = active.includes(component);
    const effectiveWeight = isActive && activeWeight ? (weights[component] / activeWeight) * 100 : 0;
    const score = value === null ? null : Math.round(clamp01(value) * 100);
    return {
      component,
      value,
      score,
      configuredWeight: weights[component],
      effectiveWeight: Math.round(effectiveWeight * 10) / 10,
      contribution: score === null ? 0 : Math.round(((score * effectiveWeight) / 100) * 10) / 10,
      explanation,
    };
  });

  return {
    score: activeWeight ? Math.round(breakdown.reduce((sum, item) => sum + (item.score ?? 0) * (item.effectiveWeight / 100), 0)) : null,
    breakdown,
    excluded: SCORE_COMPONENTS.filter((component) => !active.includes(component)),
  };
}
