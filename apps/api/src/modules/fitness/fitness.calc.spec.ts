import { estimatedOneRepMax, workoutVolume } from './fitness.calc.js';

describe('fitness calculations', () => {
  it('counts volume only for completed sets', () => {
    expect(
      workoutVolume([
        { weight: 60, reps: 8, completed: true },
        { weight: 60, reps: 8, completed: true },
        { weight: 60, reps: 8, completed: false },
        { weight: null, reps: 20, completed: true },
      ]),
    ).toBe(960);
  });

  it('estimates one-rep max with the Epley formula', () => {
    expect(estimatedOneRepMax(100, 1)).toBe(100);
    expect(estimatedOneRepMax(100, 5)).toBe(116.7);
    expect(estimatedOneRepMax(0, 5)).toBe(0);
  });
});
