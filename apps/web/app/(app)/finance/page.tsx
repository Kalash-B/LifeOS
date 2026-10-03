"use client";

import { ArrowDownLeft, ArrowUpRight, ChevronLeft, ChevronRight, Landmark, PiggyBank, Plus, Trash2, TrendingUp, Wallet } from "lucide-react";
import { useState } from "react";
import { ChartFrame } from "@/components/charts/chart-frame";
import { BarSeriesChart, RankedBars } from "@/components/charts/charts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm";
import { PageHeader } from "@/components/ui/page-header";
import { Progress } from "@/components/ui/progress";
import { Segmented } from "@/components/ui/segmented";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { StatCard } from "@/components/ui/stat-card";
import { useAddParam } from "@/hooks/use-add-param";
import { useApi, useApiMutation } from "@/hooks/use-api";
import { api } from "@/lib/api";
import { dateKey, formatDate, formatDateKey, formatMoney, humanize } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Expense, FinanceAccount, FinanceSummary, Income, Investment, SavingsGoal } from "@/types/api";
import { AccountDialog, ContributeDialog, InvestmentDialog, InvestmentValueDialog, SavingsGoalDialog, TransactionDialog } from "./dialogs";

function shiftMonth(month: string, delta: number) {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1 + delta, 1)).toISOString().slice(0, 7);
}

type DialogState =
  | { kind: "account" }
  | { kind: "income" }
  | { kind: "expense" }
  | { kind: "goal" }
  | { kind: "contribute"; goal: SavingsGoal }
  | { kind: "investment" }
  | { kind: "investment-value"; investment: Investment }
  | { kind: "delete-tx"; tx: { id: string; type: "income" | "expense"; label: string } }
  | null;

export default function FinancePage() {
  const currentMonth = dateKey().slice(0, 7);
  const [month, setMonth] = useState(currentMonth);
  const [tab, setTab] = useState<"overview" | "accounts" | "goals">("overview");
  const summary = useApi<FinanceSummary>(["finance", "summary", month], `/finance/summary?month=${month}`);
  const accounts = useApi<FinanceAccount[]>(["finance", "accounts"], "/finance/accounts");
  const incomes = useApi<Income[]>(["finance", "income", month], `/finance/income?month=${month}`);
  const expenses = useApi<Expense[]>(["finance", "expenses", month], `/finance/expenses?month=${month}`);
  const goals = useApi<SavingsGoal[]>(["finance", "savings"], "/finance/savings");
  const investments = useApi<Investment[]>(["finance", "investments"], "/finance/investments");
  const [add, clearAdd] = useAddParam();
  const [dialog, setDialog] = useState<DialogState>(null);
  const close = () => { setDialog(null); clearAdd(); };
  const removeTx = useApiMutation(({ id, type }: { id: string; type: "income" | "expense" }) => api(`/finance/${type === "income" ? "income" : "expenses"}/${id}`, { method: "DELETE" }), { invalidate: [["finance"]], success: "Transaction deleted", onSuccess: close });
  const archiveAccount = useApiMutation((a: FinanceAccount) => api(`/finance/accounts/${a.id}`, { method: "PATCH", body: { isActive: !a.isActive } }), { invalidate: [["finance"]] });
  const removeInvestment = useApiMutation((id: string) => api(`/finance/investments/${id}`, { method: "DELETE" }), { invalidate: [["finance"]] });

  const s = summary.data;
  const currency = s?.currency ?? "INR";
  const hasAccounts = Boolean(accounts.data?.some((a) => a.isActive));
  const activeDialog: DialogState = dialog ?? (add === "expense" && hasAccounts ? { kind: "expense" } : add === "expense" && accounts.data ? { kind: "account" } : null);
  const transactions = [
    ...(incomes.data ?? []).map((i) => ({ id: i.id, type: "income" as const, date: i.incomeDate, label: i.source, category: i.category, amount: i.amount, account: i.account.name })),
    ...(expenses.data ?? []).map((e) => ({ id: e.id, type: "expense" as const, date: e.expenseDate, label: e.description || e.category, category: e.category, amount: e.amount, account: e.account.name })),
  ].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <>
      <PageHeader
        title="Finance"
        description="Income, spending, savings and investments. Savings = income − expenses."
        actions={
          <>
            <Button variant="secondary" disabled={!hasAccounts} onClick={() => setDialog({ kind: "income" })}><ArrowDownLeft className="size-4" /> Income</Button>
            <Button disabled={!hasAccounts} onClick={() => setDialog({ kind: "expense" })}><ArrowUpRight className="size-4" /> Expense</Button>
          </>
        }
      />
      {accounts.data && !accounts.data.length ? (
        <Card>
          <EmptyState icon={Landmark} title="Add your first account" description="Accounts hold your balances — a bank account, cash or a wallet. You enter numbers yourself; no bank login needed." action={<Button onClick={() => setDialog({ kind: "account" })}>Add account</Button>} />
        </Card>
      ) : (
        <>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <Segmented label="Finance section" value={tab} onChange={setTab} options={[{ value: "overview", label: "Overview" }, { value: "accounts", label: "Accounts" }, { value: "goals", label: "Savings & investments" }]} />
            {tab === "overview" && (
              <div className="flex items-center gap-1">
                <Button size="icon-sm" variant="ghost" aria-label="Previous month" onClick={() => setMonth(shiftMonth(month, -1))}><ChevronLeft className="size-4" /></Button>
                <span className="w-32 text-center text-sm font-medium" aria-live="polite">{formatDateKey(`${month}-01`, { month: "long", year: "numeric" })}</span>
                <Button size="icon-sm" variant="ghost" aria-label="Next month" disabled={month >= currentMonth} onClick={() => setMonth(shiftMonth(month, 1))}><ChevronRight className="size-4" /></Button>
              </div>
            )}
          </div>

          {tab === "overview" &&
            (summary.isError ? (
              <ErrorState error={summary.error} onRetry={() => summary.refetch()} />
            ) : !s ? (
              <LoadingState rows={4} />
            ) : (
              <div className="grid gap-5">
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                  <StatCard label="Income" icon={ArrowDownLeft} value={formatMoney(s.income, currency, true)} />
                  <StatCard label="Expenses" icon={ArrowUpRight} value={formatMoney(s.expenses, currency, true)} />
                  <StatCard label="Savings" icon={PiggyBank} value={<span className={cn(s.savings < 0 && "text-danger")}>{formatMoney(s.savings, currency, true)}</span>} sub={s.savingsRate === null ? "no income this month" : `${s.savingsRate}% of income${s.savings < 0 ? " · overspent" : ""}`} />
                  <StatCard label="Total balance" icon={Wallet} value={formatMoney(s.totalBalance, currency, true)} sub={`${s.accountCount} active account${s.accountCount === 1 ? "" : "s"}`} />
                </div>
                <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
                  <Card>
                    <CardHeader title="Income vs expenses" description="Last 6 months" />
                    <CardContent>
                      <ChartFrame summary="Monthly income and expenses for the last 6 months" columns={["Month", "Income", "Expenses", "Savings"]} rows={s.trend.map((t) => [formatDateKey(`${t.month}-01`, { month: "short", year: "numeric" }), formatMoney(t.income, currency), formatMoney(t.expenses, currency), formatMoney(t.savings, currency)])}>
                        <BarSeriesChart
                          data={s.trend}
                          xKey="month"
                          xFormat={(m) => formatDateKey(`${m}-01`, { month: "short" })}
                          format={(v) => formatMoney(v, currency, true)}
                          series={[{ key: "income", label: "Income", color: "var(--series-1)" }, { key: "expenses", label: "Expenses", color: "var(--series-2)" }]}
                        />
                      </ChartFrame>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader title="Spending by category" />
                    <CardContent>{s.expensesByCategory.length ? <RankedBars items={s.expensesByCategory.map((c) => ({ label: c.category, value: c.amount }))} format={(v) => formatMoney(v, currency)} /> : <p className="text-sm text-text-3">No expenses this month.</p>}</CardContent>
                  </Card>
                </div>
                <Card>
                  <CardHeader title="Transactions" description={`${transactions.length} this month`} />
                  <CardContent className="pt-2">
                    {!transactions.length ? (
                      <p className="text-sm text-text-3">No transactions this month.</p>
                    ) : (
                      <ul className="divide-y divide-border">
                        {transactions.map((t) => (
                          <li key={`${t.type}-${t.id}`} className="flex items-center gap-3 py-2.5 text-sm">
                            <span className={cn("grid size-8 shrink-0 place-items-center rounded-lg", t.type === "income" ? "bg-success-soft text-success" : "bg-surface-2 text-text-2")} aria-hidden>
                              {t.type === "income" ? <ArrowDownLeft className="size-4" /> : <ArrowUpRight className="size-4" />}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-medium">{t.label}</p>
                              <p className="truncate text-xs text-text-3">{t.category} · {t.account} · {formatDate(t.date, { month: "short", day: "numeric" })}</p>
                            </div>
                            <span className={cn("tabular shrink-0 font-medium", t.type === "income" && "text-success")}>
                              <span className="sr-only">{t.type === "income" ? "Income" : "Expense"} </span>
                              {t.type === "income" ? "+" : "−"}{formatMoney(t.amount, currency)}
                            </span>
                            <Button size="icon-sm" variant="ghost" aria-label={`Delete ${t.label}`} onClick={() => setDialog({ kind: "delete-tx", tx: t })}><Trash2 className="size-3.5" /></Button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </CardContent>
                </Card>
              </div>
            ))}

          {tab === "accounts" && (
            <Card>
              <CardHeader title="Accounts" description="Balances update automatically with income and expenses." action={<Button size="sm" variant="soft" onClick={() => setDialog({ kind: "account" })}><Plus className="size-4" /> Add account</Button>} />
              <CardContent className="pt-2">
                {!accounts.data ? (
                  <LoadingState className="p-0" />
                ) : (
                  <ul className="divide-y divide-border">
                    {accounts.data.map((a) => (
                      <li key={a.id} className={cn("flex items-center gap-3 py-3", !a.isActive && "opacity-60")}>
                        <Landmark className="size-5 text-text-3" aria-hidden />
                        <div className="min-w-0 flex-1">
                          <p className="flex items-center gap-2 font-medium">{a.name}{!a.isActive && <Badge>Archived</Badge>}</p>
                          <p className="text-xs text-text-3">{humanize(a.type)} · {a.currency}</p>
                        </div>
                        <span className={cn("tabular font-semibold", a.currentBalance < 0 && "text-danger")}>{formatMoney(a.currentBalance, a.currency)}</span>
                        <Button size="sm" variant="ghost" onClick={() => archiveAccount.mutate(a)}>{a.isActive ? "Archive" : "Restore"}</Button>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          )}

          {tab === "goals" && (
            <div className="grid gap-5 lg:grid-cols-2">
              <Card>
                <CardHeader title="Savings goals" action={<Button size="sm" variant="soft" onClick={() => setDialog({ kind: "goal" })}><Plus className="size-4" /> New goal</Button>} />
                <CardContent className="pt-2">
                  {!goals.data?.length ? (
                    <EmptyState icon={PiggyBank} title="No savings goals" />
                  ) : (
                    <ul className="grid gap-5">
                      {goals.data.map((g) => {
                        const pct = g.targetAmount ? Math.min(100, (g.currentAmount / g.targetAmount) * 100) : 0;
                        return (
                          <li key={g.id}>
                            <div className="flex items-center justify-between gap-2 text-sm">
                              <span className="flex items-center gap-2 font-medium">{g.name}{g.status === "ACHIEVED" && <Badge tone="success">Reached</Badge>}</span>
                              <Button size="sm" variant="ghost" onClick={() => setDialog({ kind: "contribute", goal: g })}>Update</Button>
                            </div>
                            <Progress className="mt-1" value={pct} label={`${g.name} progress`} tone={g.status === "ACHIEVED" ? "success" : "accent"} />
                            <p className="tabular mt-1 text-xs text-text-3">
                              {formatMoney(g.currentAmount, currency)} of {formatMoney(g.targetAmount, currency)} · {Math.round(pct)}%{g.targetDate ? ` · by ${formatDate(g.targetDate)}` : ""}
                            </p>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader
                  title="Investments"
                  description={s ? `${formatMoney(s.investments.currentValue, currency)} · ${s.investments.gain >= 0 ? "+" : ""}${formatMoney(s.investments.gain, currency)} overall` : undefined}
                  action={<Button size="sm" variant="soft" onClick={() => setDialog({ kind: "investment" })}><Plus className="size-4" /> Add</Button>}
                />
                <CardContent className="pt-2">
                  {!investments.data?.length ? (
                    <EmptyState icon={TrendingUp} title="No investments tracked" />
                  ) : (
                    <ul className="divide-y divide-border">
                      {investments.data.map((inv) => {
                        const gain = inv.currentValue - inv.amountInvested;
                        return (
                          <li key={inv.id} className="flex items-center gap-3 py-2.5 text-sm">
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-medium">{inv.name}</p>
                              <p className="text-xs text-text-3">{inv.assetType} · invested {formatMoney(inv.amountInvested, currency)}</p>
                            </div>
                            <div className="text-right">
                              <p className="tabular font-medium">{formatMoney(inv.currentValue, currency)}</p>
                              <p className={cn("tabular text-xs", gain >= 0 ? "text-success" : "text-danger")}>{gain >= 0 ? "▲ +" : "▼ "}{formatMoney(gain, currency)}</p>
                            </div>
                            <Button size="sm" variant="ghost" onClick={() => setDialog({ kind: "investment-value", investment: inv })}>Update</Button>
                            <Button size="icon-sm" variant="ghost" aria-label={`Delete ${inv.name}`} onClick={() => removeInvestment.mutate(inv.id)}><Trash2 className="size-3.5" /></Button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}

      {activeDialog?.kind === "account" && <AccountDialog currency={currency} onClose={close} />}
      {(activeDialog?.kind === "income" || activeDialog?.kind === "expense") && accounts.data && <TransactionDialog kind={activeDialog.kind} accounts={accounts.data} onClose={close} />}
      {activeDialog?.kind === "goal" && <SavingsGoalDialog onClose={close} />}
      {activeDialog?.kind === "contribute" && <ContributeDialog goal={activeDialog.goal} currency={currency} onClose={close} />}
      {activeDialog?.kind === "investment" && <InvestmentDialog onClose={close} />}
      {activeDialog?.kind === "investment-value" && <InvestmentValueDialog investment={activeDialog.investment} onClose={close} />}
      <ConfirmDialog
        open={activeDialog?.kind === "delete-tx"}
        title="Delete transaction?"
        message="The account balance will be adjusted back."
        loading={removeTx.isPending}
        onConfirm={() => activeDialog?.kind === "delete-tx" && removeTx.mutate(activeDialog.tx)}
        onClose={close}
      />
    </>
  );
}
