"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogActions } from "@/components/ui/dialog";
import { Field, FormRow } from "@/components/ui/field";
import { Input, Select, Textarea } from "@/components/ui/input";
import { useApiMutation } from "@/hooks/use-api";
import { api } from "@/lib/api";
import { dateKey, formatMoney } from "@/lib/format";
import type { FinanceAccount, Investment, SavingsGoal } from "@/types/api";

const CURRENCIES = ["INR", "USD", "EUR", "GBP", "JPY", "AUD", "CAD", "SGD", "AED"];
export const EXPENSE_CATEGORIES = ["Food", "Groceries", "Rent", "Transport", "Utilities", "Shopping", "Health", "Education", "Entertainment", "Travel", "Subscriptions", "Other"];
export const INCOME_CATEGORIES = ["Salary", "Freelance", "Business", "Investments", "Gift", "Refund", "Other"];

/** Money: positive, at most two decimals (mirrors the API rule). */
const money = z.preprocess(
  (v) => (v === "" || v === undefined ? undefined : Number(v)),
  z.number({ message: "Enter an amount" }).positive("Must be greater than 0").max(999_999_999_999).refine((n) => Math.round(n * 100) === n * 100, "At most 2 decimals"),
);
const optionalMoney = z.preprocess((v) => (v === "" || v === undefined ? undefined : Number(v)), z.number().min(0).max(999_999_999_999).optional());
/** A calendar date entered by the user → noon local time, so it never shifts a day in other zones. */
const dayToIso = (day: string) => new Date(`${day}T12:00:00`).toISOString();

function Actions({ onClose, loading, label = "Save" }: { onClose: () => void; loading: boolean; label?: string }) {
  return (
    <DialogActions>
      <Button variant="secondary" onClick={onClose}>Cancel</Button>
      <Button type="submit" loading={loading}>{label}</Button>
    </DialogActions>
  );
}

const accountSchema = z.object({
  name: z.string().trim().min(1, "Required").max(120),
  type: z.enum(["CASH", "BANK", "WALLET", "OTHER"]),
  currency: z.enum(CURRENCIES as [string, ...string[]]),
  openingBalance: z.preprocess((v) => (v === "" || v === undefined ? undefined : Number(v)), z.number().optional()),
});

export function AccountDialog({ currency, onClose }: { currency: string; onClose: () => void }) {
  const form = useForm({ resolver: zodResolver(accountSchema), defaultValues: { name: "", type: "BANK" as const, currency, openingBalance: undefined } });
  const save = useApiMutation((v: z.output<typeof accountSchema>) => api("/finance/accounts", { method: "POST", body: v }), { invalidate: [["finance"]], success: "Account added", onSuccess: onClose });
  return (
    <Dialog open onClose={onClose} title="Add account" description="Track balances manually — LifeOS never asks for bank credentials.">
      <form onSubmit={form.handleSubmit((v) => save.mutate(v))} className="grid gap-4">
        <Field label="Name" error={form.formState.errors.name?.message}>
          <Input autoFocus placeholder="Savings account, Cash, Paytm…" {...form.register("name")} />
        </Field>
        <FormRow>
          <Field label="Type">
            <Select {...form.register("type")}>
              <option value="BANK">Bank</option>
              <option value="CASH">Cash</option>
              <option value="WALLET">Wallet</option>
              <option value="OTHER">Other</option>
            </Select>
          </Field>
          <Field label="Currency">
            <Select {...form.register("currency")}>{CURRENCIES.map((c) => <option key={c}>{c}</option>)}</Select>
          </Field>
        </FormRow>
        <Field label="Current balance" hint="Your balance today; transactions update it from here.">
          <Input type="number" step="0.01" inputMode="decimal" {...form.register("openingBalance")} />
        </Field>
        <Actions onClose={onClose} loading={save.isPending} />
      </form>
    </Dialog>
  );
}

const txSchema = z.object({
  accountId: z.string().min(1, "Choose an account"),
  amount: money,
  category: z.string().min(1, "Choose a category"),
  date: z.string().min(1),
  source: z.string().max(120).optional(),
  paymentMethod: z.string().max(30).optional(),
  description: z.string().max(2000).optional(),
});

export function TransactionDialog({ kind, accounts, onClose }: { kind: "income" | "expense"; accounts: FinanceAccount[]; onClose: () => void }) {
  const active = accounts.filter((a) => a.isActive);
  const form = useForm({
    resolver: zodResolver(txSchema),
    defaultValues: { accountId: active[0]?.id ?? "", amount: undefined, category: "", date: dateKey(), source: "", paymentMethod: "", description: "" },
  });
  const save = useApiMutation(
    (v: z.output<typeof txSchema>) =>
      kind === "income"
        ? api("/finance/income", { method: "POST", body: { accountId: v.accountId, amount: v.amount, category: v.category, source: v.source || v.category, incomeDate: dayToIso(v.date), description: v.description || undefined } })
        : api("/finance/expenses", { method: "POST", body: { accountId: v.accountId, amount: v.amount, category: v.category, expenseDate: dayToIso(v.date), paymentMethod: v.paymentMethod || undefined, description: v.description || undefined } }),
    { invalidate: [["finance"]], success: kind === "income" ? "Income added" : "Expense added", onSuccess: onClose },
  );
  const errors = form.formState.errors;
  const categories = kind === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  return (
    <Dialog open onClose={onClose} title={kind === "income" ? "Add income" : "Add expense"}>
      <form onSubmit={form.handleSubmit((v) => save.mutate(v))} className="grid gap-4">
        <FormRow>
          <Field label="Amount" error={errors.amount?.message}>
            <Input autoFocus type="number" step="0.01" min="0" inputMode="decimal" {...form.register("amount")} />
          </Field>
          <Field label="Date">
            <Input type="date" {...form.register("date")} />
          </Field>
        </FormRow>
        <FormRow>
          <Field label="Category" error={errors.category?.message}>
            <Select {...form.register("category")}>
              <option value="">Choose…</option>
              {categories.map((c) => <option key={c}>{c}</option>)}
            </Select>
          </Field>
          <Field label="Account" error={errors.accountId?.message}>
            <Select {...form.register("accountId")}>{active.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</Select>
          </Field>
        </FormRow>
        {kind === "income" ? (
          <Field label="Source">
            <Input placeholder="Employer, client…" {...form.register("source")} />
          </Field>
        ) : (
          <Field label="Payment method">
            <Select {...form.register("paymentMethod")}>
              <option value="">—</option>
              {["UPI", "Card", "Cash", "Net banking", "Other"].map((m) => <option key={m}>{m}</option>)}
            </Select>
          </Field>
        )}
        <Field label="Note">
          <Textarea {...form.register("description")} />
        </Field>
        <Actions onClose={onClose} loading={save.isPending} label="Add" />
      </form>
    </Dialog>
  );
}

const goalSchema = z.object({ name: z.string().trim().min(1, "Required").max(120), targetAmount: money, currentAmount: optionalMoney, targetDate: z.string().optional() });

export function SavingsGoalDialog({ onClose }: { onClose: () => void }) {
  const form = useForm({ resolver: zodResolver(goalSchema), defaultValues: { name: "", targetAmount: undefined, currentAmount: undefined, targetDate: "" } });
  const save = useApiMutation((v: z.output<typeof goalSchema>) => api("/finance/savings", { method: "POST", body: { ...v, targetDate: v.targetDate || undefined } }), { invalidate: [["finance"]], success: "Savings goal created", onSuccess: onClose });
  const errors = form.formState.errors;
  return (
    <Dialog open onClose={onClose} title="New savings goal">
      <form onSubmit={form.handleSubmit((v) => save.mutate(v))} className="grid gap-4">
        <Field label="Goal" error={errors.name?.message}>
          <Input autoFocus placeholder="Emergency fund, New laptop…" {...form.register("name")} />
        </Field>
        <FormRow>
          <Field label="Target amount" error={errors.targetAmount?.message}>
            <Input type="number" step="0.01" inputMode="decimal" {...form.register("targetAmount")} />
          </Field>
          <Field label="Already saved" error={errors.currentAmount?.message}>
            <Input type="number" step="0.01" inputMode="decimal" {...form.register("currentAmount")} />
          </Field>
        </FormRow>
        <Field label="Target date">
          <Input type="date" {...form.register("targetDate")} />
        </Field>
        <Actions onClose={onClose} loading={save.isPending} />
      </form>
    </Dialog>
  );
}

const contributeSchema = z.object({ amount: z.preprocess((v) => Number(v), z.number().refine((n) => n !== 0 && !Number.isNaN(n), "Enter an amount")) });

export function ContributeDialog({ goal, currency, onClose }: { goal: SavingsGoal; currency: string; onClose: () => void }) {
  const form = useForm({ resolver: zodResolver(contributeSchema), defaultValues: { amount: undefined } });
  const save = useApiMutation(
    ({ amount }: z.output<typeof contributeSchema>) => api(`/finance/savings/${goal.id}`, { method: "PATCH", body: { currentAmount: Math.max(0, Math.round((goal.currentAmount + amount) * 100) / 100) } }),
    { invalidate: [["finance"]], success: "Savings updated", onSuccess: onClose },
  );
  return (
    <Dialog open onClose={onClose} title={`Update “${goal.name}”`} description={`${formatMoney(goal.currentAmount, currency)} of ${formatMoney(goal.targetAmount, currency)} saved`}>
      <form onSubmit={form.handleSubmit((v) => save.mutate(v))} className="grid gap-4">
        <Field label="Add amount" hint="Use a negative number to withdraw" error={form.formState.errors.amount?.message}>
          <Input autoFocus type="number" step="0.01" inputMode="decimal" {...form.register("amount")} />
        </Field>
        <Actions onClose={onClose} loading={save.isPending} />
      </form>
    </Dialog>
  );
}

const investmentSchema = z.object({ name: z.string().trim().min(1, "Required").max(120), assetType: z.string().min(1, "Required"), amountInvested: money, currentValue: optionalMoney, purchaseDate: z.string().optional() });

export function InvestmentDialog({ onClose }: { onClose: () => void }) {
  const form = useForm({ resolver: zodResolver(investmentSchema), defaultValues: { name: "", assetType: "Mutual fund", amountInvested: undefined, currentValue: undefined, purchaseDate: "" } });
  const save = useApiMutation((v: z.output<typeof investmentSchema>) => api("/finance/investments", { method: "POST", body: { ...v, purchaseDate: v.purchaseDate ? dayToIso(v.purchaseDate) : undefined } }), { invalidate: [["finance"]], success: "Investment added", onSuccess: onClose });
  const errors = form.formState.errors;
  return (
    <Dialog open onClose={onClose} title="Add investment">
      <form onSubmit={form.handleSubmit((v) => save.mutate(v))} className="grid gap-4">
        <Field label="Name" error={errors.name?.message}>
          <Input autoFocus placeholder="Nifty 50 index fund" {...form.register("name")} />
        </Field>
        <FormRow>
          <Field label="Type">
            <Select {...form.register("assetType")}>{["Mutual fund", "Stocks", "ETF", "Fixed deposit", "Bonds", "Gold", "Crypto", "Real estate", "Other"].map((t) => <option key={t}>{t}</option>)}</Select>
          </Field>
          <Field label="Purchase date">
            <Input type="date" {...form.register("purchaseDate")} />
          </Field>
        </FormRow>
        <FormRow>
          <Field label="Amount invested" error={errors.amountInvested?.message}>
            <Input type="number" step="0.01" inputMode="decimal" {...form.register("amountInvested")} />
          </Field>
          <Field label="Current value" hint="Defaults to amount invested">
            <Input type="number" step="0.01" inputMode="decimal" {...form.register("currentValue")} />
          </Field>
        </FormRow>
        <Actions onClose={onClose} loading={save.isPending} />
      </form>
    </Dialog>
  );
}

const valueSchema = z.object({ currentValue: z.preprocess((v) => Number(v), z.number().min(0, "Must be 0 or more")) });

export function InvestmentValueDialog({ investment, onClose }: { investment: Investment; onClose: () => void }) {
  const form = useForm({ resolver: zodResolver(valueSchema), defaultValues: { currentValue: investment.currentValue } });
  const save = useApiMutation((v: z.output<typeof valueSchema>) => api(`/finance/investments/${investment.id}`, { method: "PATCH", body: v }), { invalidate: [["finance"]], success: "Value updated", onSuccess: onClose });
  return (
    <Dialog open onClose={onClose} title={`Update ${investment.name}`}>
      <form onSubmit={form.handleSubmit((v) => save.mutate(v))} className="grid gap-4">
        <Field label="Current value" error={form.formState.errors.currentValue?.message}>
          <Input autoFocus type="number" step="0.01" inputMode="decimal" {...form.register("currentValue")} />
        </Field>
        <Actions onClose={onClose} loading={save.isPending} />
      </form>
    </Dialog>
  );
}
