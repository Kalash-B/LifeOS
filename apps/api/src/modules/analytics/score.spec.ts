import { computeScore, DEFAULT_SCORE_WEIGHTS } from './score.js';

const component = (value: number | null) => ({ value, explanation: 'test' });

describe('LifeOS score', () => {
  it('applies the spec §20 weights', () => {
    const result = computeScore({
      routine: component(1),
      habits: component(0.5),
      fitness: component(1),
      learning: component(0),
      projects: component(1),
      finance: component(1),
    });
    // 20 + 10 + 15 + 0 + 15 + 10
    expect(result.score).toBe(70);
    expect(result.excluded).toEqual([]);
  });

  it('excludes components without data and renormalizes the rest', () => {
    const result = computeScore({
      routine: component(1),
      habits: component(1),
      fitness: component(null),
      learning: component(null),
      projects: component(null),
      finance: component(null),
    });
    expect(result.score).toBe(100);
    expect(result.excluded).toEqual(['fitness', 'learning', 'projects', 'finance']);
    expect(result.breakdown.find((b) => b.component === 'routine')?.effectiveWeight).toBe(50);
  });

  it('respects custom weights and clamps values', () => {
    const result = computeScore(
      {
        routine: component(2),
        habits: component(0),
        fitness: component(0),
        learning: component(0),
        projects: component(0),
        finance: component(0),
      },
      { ...DEFAULT_SCORE_WEIGHTS, routine: 100, habits: 0, fitness: 0, learning: 0, projects: 0, finance: 0 },
    );
    expect(result.score).toBe(100);
  });

  it('returns null when nothing can be measured', () => {
    const empty = component(null);
    expect(computeScore({ routine: empty, habits: empty, fitness: empty, learning: empty, projects: empty, finance: empty }).score).toBeNull();
  });
});
