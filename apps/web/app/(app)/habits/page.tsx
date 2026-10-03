"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Archive, ArchiveRestore, BarChart2, Check, Flame, Minus, Pencil, Plus, Repeat, Trash2, X } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckButton } from "@/components/ui/check-button";
import { ConfirmDialog } from "@/components/ui/confirm";
import { Dialog, DialogActions } from "@/components/ui/dialog";
import { Field, FormRow } from "@/components/ui/field";
import { Input, Select, Textarea } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Segmented } from "@/components/ui/segmented";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { useToggleHabit } from "@/hooks/use-actions";
import { useApi, useApiMutation } from "@/hooks/use-api";
import { api } from "@/lib/api";
import { dateKey, formatDateKey, weekdayShort } from "@/lib/format";
import { cn, toOptionalNumber } from "@/lib/utils";
import type { Habit, HabitFrequency, HabitStats } from "@/types/api";

const FREQUENCY_LABEL: Record<HabitFrequency, string> = { DAILY: "Every day", WEEKDAYS: "Weekdays", WEEKLY: "Times per week" };

const schema = z
  .object({
    name: z.string().trim().min(1, "Required").max(120),
    description: z.string().max(2000).optional(),
    frequencyType: z.enum(["DAILY", "WEEKDAYS", "WEEKLY"]),
    targetValue: z.preprocess(toOptionalNumber, z.number().positive("Must be positive").max(100000).optional()),
    unit: z.string().max(30).optional(),
    reminderTime: z.string().optional(),
  })
  .refine((v) => v.frequencyType !== "WEEKLY" || (v.targetValue && v.targetValue <= 7 && Number.isInteger(v.targetValue)), {
    path: ["targetValue"],
    message: "Times per week must be a whole number from 1 to 7",
  });

function HabitDialog({ habit, onClose }: { habit?: Habit; onClose: () => void }) {
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      name: habit?.name ?? "",
      description: habit?.description ?? "",
      frequencyType: habit?.frequencyType ?? "DAILY",
      targetValue: habit?.targetValue ?? undefined,
      unit: habit?.unit ?? "",
      reminderTime: habit?.reminderTime ?? "",
    },
  });
  const frequency = form.watch("frequencyType");
  const save = useApiMutation(
    (v: z.output<typeof schema>) => {
      const body = { ...v, description: v.description || null, unit: v.unit || null, reminderTime: v.reminderTime || null, targetValue: v.targetValue ?? null };
      return habit ? api(`/habits/${habit.id}`, { method: "PATCH", body }) : api("/habits", { method: "POST", body });
    },
    { invalidate: [["habits"]], success: habit ? "Habit updated" : "Habit created", onSuccess: onClose },
  );
  const errors = form.formState.errors;
  return (
    <Dialog open onClose={onClose} title={habit ? "Edit habit" : "New habit"}>
      <form onSubmit={form.handleSubmit((v) => save.mutate(v))} className="grid gap-4">
        <Field label="Habit" error={errors.name?.message}>
          <Input autoFocus placeholder="Read, Meditate, DSA…" {...form.register("name")} />
        </Field>
        <FormRow>
          <Field label="Frequency">
            <Select {...form.register("frequencyType")}>
              {Object.entries(FREQUENCY_LABEL).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </Select>
          </Field>
          <Field label={frequency === "WEEKLY" ? "Times per week" : "Daily target (optional)"} error={errors.targetValue?.message}>
            <Input type="number" step="any" min={0} {...form.register("targetValue")} />
          </Field>
        </FormRow>
        <FormRow>
          <Field label="Unit (optional)" hint="e.g. pages, minutes, glasses">
            <Input {...form.register("unit")} />
          </Field>
          <Field label="Reminder (optional)" hint="Sent if not done by this time">
            <Input type="time" {...form.register("reminderTime")} />
          </Field>
        </FormRow>
        <Field label="Why it matters (optional)">
          <Textarea {...form.register("description")} />
        </Field>
        <DialogActions>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={save.isPending}>Save</Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

function DayMark({ status, scheduled, label }: { status: string | null; scheduled: boolean; label: string }) {
  const done = status === "COMPLETED";
  const skipped = status === "SKIPPED" || status === "MISSED";
  return (
    <span
      title={label}
      aria-label={label}
      role="img"
      className={cn(
        "grid size-6 place-items-center rounded-md text-[10px]",
        done ? "bg-accent text-accent-fg" : scheduled ? "bg-surface-3 text-text-3" : "border border-dashed border-border text-text-3",
      )}
    >
      {done ? <Check className="size-3.5" strokeWidth={3} /> : skipped ? <X className="size-3" /> : !scheduled ? <Minus className="size-3" /> : null}
    </span>
  );
}

function StatsDialog({ habit, onClose }: { habit: Habit; onClose: () => void }) {
  const { data, isError, error } = useApi<HabitStats>(["habits", habit.id, "stats"], `/habits/${habit.id}/stats`);
  const today = dateKey();
  const days = Array.from({ length: 91 }, (_, i) => {
    const d = new Date(`${today}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() - (90 - i));
    return d.toISOString().slice(0, 10);
  });
  const done = new Set(data?.history.filter((h) => h.status === "COMPLETED").map((h) => h.date));
  return (
    <Dialog open onClose={onClose} title={habit.name} description={FREQUENCY_LABEL[habit.frequencyType]} className="w-[min(100%-2rem,36rem)]">
      {isError ? (
        <ErrorState error={error} />
      ) : !data ? (
        <LoadingState rows={2} className="p-0" />
      ) : (
        <div className="grid gap-5">
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ["Current streak", `${data.streak.current} ${data.streak.unit}${data.streak.current === 1 ? "" : "s"}`],
              ["Best streak", `${data.streak.best} ${data.streak.unit}${data.streak.best === 1 ? "" : "s"}`],
              ["Last 7 days", `${data.completionRate7}%`],
              ["Last 30 days", `${data.completionRate30}%`],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg bg-surface-2 p-3">
                <dt className="text-xs text-text-3">{label}</dt>
                <dd className="tabular mt-1 font-semibold">{value}</dd>
              </div>
            ))}
          </dl>
          <div>
            <p className="mb-2 text-sm font-medium text-text-2">Last 13 weeks</p>
            <div className="grid grid-flow-col grid-rows-7 gap-1" role="list" aria-label="Completion history, last 91 days">
              {days.map((d) => (
                <span key={d} role="listitem" aria-label={`${formatDateKey(d)}: ${done.has(d) ? "done" : "not done"}`} title={formatDateKey(d)} className={cn("aspect-square rounded-[3px]", done.has(d) ? "bg-accent" : "bg-surface-3")} />
              ))}
            </div>
            <p className="mt-2 flex items-center gap-3 text-xs text-text-3">
              <span className="flex items-center gap-1"><span className="size-2.5 rounded-sm bg-accent" /> Done</span>
              <span className="flex items-center gap-1"><span className="size-2.5 rounded-sm bg-surface-3" /> Not done</span>
              <span className="ml-auto">{data.totalCompletions} completions total</span>
            </p>
          </div>
        </div>
      )}
    </Dialog>
  );
}

type DialogState = { kind: "edit"; habit?: Habit } | { kind: "stats"; habit: Habit } | { kind: "delete"; habit: Habit } | null;

export default function HabitsPage() {
  const [view, setView] = useState<"active" | "all">("active");
  const habits = useApi<Habit[]>(["habits", view], `/habits${view === "all" ? "?includeArchived=true" : ""}`);
  const toggle = useToggleHabit();
  const [dialog, setDialog] = useState<DialogState>(null);
  const close = () => setDialog(null);
  const archive = useApiMutation((h: Habit) => api(`/habits/${h.id}`, { method: "PATCH", body: { isActive: !h.isActive } }), { invalidate: [["habits"]] });
  const remove = useApiMutation((id: string) => api(`/habits/${id}`, { method: "DELETE" }), { invalidate: [["habits"]], success: "Habit deleted", onSuccess: close });
  const today = dateKey();

  return (
    <>
      <PageHeader
        title="Habits"
        description="Small things, done consistently. Streaks follow each habit's own schedule."
        actions={
          <>
            <Segmented label="Show" value={view} onChange={setView} options={[{ value: "active", label: "Active" }, { value: "all", label: "All" }]} />
            <Button onClick={() => setDialog({ kind: "edit" })}><Plus className="size-4" /> New habit</Button>
          </>
        }
      />
      {habits.isError ? (
        <ErrorState error={habits.error} onRetry={() => habits.refetch()} />
      ) : !habits.data ? (
        <LoadingState />
      ) : !habits.data.length ? (
        <Card>
          <EmptyState icon={Repeat} title="No habits yet" description="Pick one small habit you want to keep — reading, water, a walk." action={<Button onClick={() => setDialog({ kind: "edit" })}>Create a habit</Button>} />
        </Card>
      ) : (
        <ul className="grid gap-3">
          {habits.data.map((habit) => {
            const done = habit.todayStatus === "COMPLETED";
            return (
              <li key={habit.id}>
                <Card className={cn("flex flex-col gap-4 p-4 sm:flex-row sm:items-center", !habit.isActive && "opacity-60")}>
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <CheckButton
                      className="size-7"
                      checked={done}
                      disabled={!habit.isActive || toggle.isPending}
                      label={`Mark ${habit.name} ${done ? "not done" : "done"} today`}
                      onToggle={() => toggle.mutate({ habitId: habit.id, date: today, completed: !done, value: habit.frequencyType !== "WEEKLY" ? habit.targetValue ?? undefined : undefined })}
                    />
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 font-medium">
                        <span className="truncate">{habit.name}</span>
                        {!habit.isActive && <Badge>Archived</Badge>}
                      </p>
                      <p className="text-xs text-text-3">
                        {habit.frequencyType === "WEEKLY" ? `${habit.targetValue ?? 1}× per week` : FREQUENCY_LABEL[habit.frequencyType]}
                        {habit.targetValue && habit.frequencyType !== "WEEKLY" ? ` · ${habit.targetValue} ${habit.unit ?? ""}` : ""}
                        {habit.reminderTime ? ` · reminder ${habit.reminderTime}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1" aria-label="Last 7 days">
                    {habit.last7.map((d) => (
                      <div key={d.date} className="flex flex-col items-center gap-1">
                        <span className="text-[10px] text-text-3" aria-hidden>{weekdayShort(d.date).charAt(0)}</span>
                        <DayMark status={d.status} scheduled={d.scheduled} label={`${formatDateKey(d.date, { weekday: "long" })}: ${d.status === "COMPLETED" ? "done" : d.scheduled ? "not done" : "not scheduled"}`} />
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between gap-4 sm:justify-end">
                    <div className="text-right">
                      <p className="tabular flex items-center justify-end gap-1 font-semibold"><Flame className="size-4 text-accent" aria-hidden />{habit.streak.current}</p>
                      <p className="text-xs text-text-3">{habit.streak.unit === "week" ? "week" : "day"} streak · {habit.completionRate30}% (30d)</p>
                    </div>
                    <div className="flex">
                      <Button size="icon-sm" variant="ghost" aria-label={`${habit.name} statistics`} onClick={() => setDialog({ kind: "stats", habit })}><BarChart2 className="size-4" /></Button>
                      <Button size="icon-sm" variant="ghost" aria-label={`Edit ${habit.name}`} onClick={() => setDialog({ kind: "edit", habit })}><Pencil className="size-4" /></Button>
                      <Button size="icon-sm" variant="ghost" aria-label={habit.isActive ? `Archive ${habit.name}` : `Restore ${habit.name}`} onClick={() => archive.mutate(habit)}>{habit.isActive ? <Archive className="size-4" /> : <ArchiveRestore className="size-4" />}</Button>
                      <Button size="icon-sm" variant="ghost" aria-label={`Delete ${habit.name}`} onClick={() => setDialog({ kind: "delete", habit })}><Trash2 className="size-4" /></Button>
                    </div>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
      {dialog?.kind === "edit" && <HabitDialog habit={dialog.habit} onClose={close} />}
      {dialog?.kind === "stats" && <StatsDialog habit={dialog.habit} onClose={close} />}
      <ConfirmDialog open={dialog?.kind === "delete"} title="Delete habit?" message="This permanently removes the habit and its entire history. Archive it instead to keep the history." loading={remove.isPending} onConfirm={() => dialog?.kind === "delete" && remove.mutate(dialog.habit.id)} onClose={close} />
    </>
  );
}
