import { monthKeys, nextMonth, savings, savingsRate, sumMoney } from './finance.calc.js';

describe('finance calculations', () => {
  it('sums money without floating point drift', () => {
    expect(sumMoney([0.1, 0.2])).toBe(0.3);
    expect(sumMoney([19.99, 5.01, 0.01])).toBe(25.01);
  });

  it('computes savings as income minus expenses (spec §56)', () => {
    expect(savings(50000, 32500.5)).toBe(17499.5);
    expect(savings(100, 150)).toBe(-50);
  });

  it('computes savings rate and handles no income', () => {
    expect(savingsRate(1000, 750)).toBe(25);
    expect(savingsRate(0, 100)).toBeNull();
  });

  it('builds month ranges across year boundaries', () => {
    expect(monthKeys('2026-02', 3)).toEqual(['2025-12', '2026-01', '2026-02']);
    expect(nextMonth('2026-12')).toBe('2027-01');
  });
});
