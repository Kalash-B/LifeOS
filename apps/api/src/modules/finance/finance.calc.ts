/** Money helpers. Inputs are numbers with ≤2 decimals; work in integer cents to avoid float drift. */
export const toCents = (amount: number) => Math.round(amount * 100);
export const fromCents = (cents: number) => cents / 100;

export function sumMoney(amounts: number[]): number {
  return fromCents(amounts.reduce((sum, amount) => sum + toCents(amount), 0));
}

/** Spec §56: Savings = Income − Expenses (never the account balance). */
export function savings(income: number, expenses: number): number {
  return fromCents(toCents(income) - toCents(expenses));
}

/** Share of income kept, 0–100 (null when there is no income). */
export function savingsRate(income: number, expenses: number): number | null {
  if (income <= 0) return null;
  return Math.round((savings(income, expenses) / income) * 1000) / 10;
}

export function monthKeys(currentMonth: string, count: number): string[] {
  const [year, month] = currentMonth.split('-').map(Number);
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(Date.UTC(year, month - 1 - (count - 1 - index), 1));
    return date.toISOString().slice(0, 7);
  });
}

export function nextMonth(month: string): string {
  const [year, m] = month.split('-').map(Number);
  return new Date(Date.UTC(year, m, 1)).toISOString().slice(0, 7);
}
