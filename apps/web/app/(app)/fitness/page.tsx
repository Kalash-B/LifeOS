"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Dumbbell, Pencil, Plus, Scale, Trash2, Trophy } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { ChartFrame } from "@/components/charts/chart-frame";
import { BarSeriesChart, LineSeriesChart } from "@/components/charts/charts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm";
import { Dialog, DialogActions } from "@/components/ui/dialog";
import { Field, FormRow } from "@/components/ui/field";
import { Input, Select } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Segmented } from "@/components/ui/segmented";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { StatCard } from "@/components/ui/stat-card";
import { useAddParam } from "@/hooks/use-add-param";
import { useApi, useApiMutation } from "@/hooks/use-api";
import { api } from "@/lib/api";
import { formatDate, formatDateKey, formatDateTime, formatNumber, localInputToIso, nowForInput } from "@/lib/format";
import type { Exercise, FitnessProgress, WeightLog, Workout } from "@/types/api";
import { WorkoutDialog } from "./workout-dialog";

const weightSchema = z.object({
  weight: z.preprocess((v) => Number(v), z.number({ message: "Enter a weight" }).positive("Must be positive").max(1000)),
  unit: z.enum(["kg", "lb"]),
  recordedAt: z.string().min(1),
});

function WeightDialog({ onClose }: { onClose: () => void }) {
  const form = useForm({ resolver: zodResolver(weightSchema), defaultValues: { weight: undefined, unit: "kg" as const, recordedAt: nowForInput() } });
  const save = useApiMutation((v: z.output<typeof weightSchema>) => api("/fitness/weight", { method: "POST", body: { ...v, recordedAt: localInputToIso(v.recordedAt) } }), {
    invalidate: [["fitness"]],
    success: "Weight logged",
    onSuccess: onClose,
  });
  return (
    <Dialog open onClose={onClose} title="Log weight">
      <form onSubmit={form.handleSubmit((v) => save.mutate(v))} className="grid gap-4">
        <FormRow>
          <Field label="Weight" error={form.formState.errors.weight?.message}>
            <Input autoFocus type="number" step="0.1" inputMode="decimal" {...form.register("weight")} />
          </Field>
          <Field label="Unit">
            <Select {...form.register("unit")}>
              <option value="kg">kg</option>
              <option value="lb">lb</option>
            </Select>
          </Field>
        </FormRow>
        <Field label="When">
          <Input type="datetime-local" {...form.register("recordedAt")} />
        </Field>
        <DialogActions>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={save.isPending}>Save</Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

const exerciseSchema = z.object({ name: z.string().trim().min(1, "Required").max(120), muscleGroup: z.string().max(50).optional(), equipment: z.string().max(50).optional() });

function ExerciseLibrary() {
  const [q, setQ] = useState("");
  const exercises = useApi<Exercise[]>(["fitness", "exercises"], "/fitness/exercises");
  const form = useForm({ resolver: zodResolver(exerciseSchema), defaultValues: { name: "", muscleGroup: "", equipment: "" } });
  const add = useApiMutation((v: z.output<typeof exerciseSchema>) => api("/fitness/exercises", { method: "POST", body: { name: v.name, muscleGroup: v.muscleGroup || undefined, equipment: v.equipment || undefined } }), {
    invalidate: [["fitness"]],
    success: "Exercise added",
    onSuccess: () => form.reset(),
  });
  const filtered = exercises.data?.filter((e) => e.name.toLowerCase().includes(q.toLowerCase()) || e.muscleGroup?.toLowerCase().includes(q.toLowerCase())) ?? [];
  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_20rem]">
      <Card>
        <CardHeader title="Exercise library" description="Shared across all your workouts" action={<Input aria-label="Search exercises" placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} className="h-9 w-40" />} />
        <CardContent>
          {!exercises.data ? (
            <LoadingState className="p-0" />
          ) : (
            <ul className="grid gap-x-6 sm:grid-cols-2">
              {filtered.map((e) => (
                <li key={e.id} className="flex justify-between gap-3 border-b border-border py-2 text-sm">
                  <span className="font-medium">{e.name}</span>
                  <span className="text-text-3">{[e.muscleGroup, e.equipment].filter(Boolean).join(" · ")}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader title="Add exercise" />
        <CardContent>
          <form onSubmit={form.handleSubmit((v) => add.mutate(v))} className="grid gap-3">
            <Field label="Name" error={form.formState.errors.name?.message}>
              <Input {...form.register("name")} />
            </Field>
            <Field label="Muscle group">
              <Input placeholder="Chest, Legs…" {...form.register("muscleGroup")} />
            </Field>
            <Field label="Equipment">
              <Input placeholder="Barbell, Bodyweight…" {...form.register("equipment")} />
            </Field>
            <Button type="submit" loading={add.isPending}>Add</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

type DialogState = { kind: "weight" } | { kind: "workout"; workout?: Workout } | { kind: "delete-workout"; workout: Workout } | { kind: "delete-weight"; log: WeightLog } | null;

export default function FitnessPage() {
  const [tab, setTab] = useState<"overview" | "workouts" | "exercises">("overview");
  const progress = useApi<FitnessProgress>(["fitness", "progress"], "/fitness/progress");
  const workouts = useApi<Workout[]>(["fitness", "workouts"], "/fitness/workouts?days=365");
  const weights = useApi<WeightLog[]>(["fitness", "weight"], "/fitness/weight?days=365");
  const [add, clearAdd] = useAddParam();
  const [dialog, setDialog] = useState<DialogState>(null);
  const activeDialog: DialogState = dialog ?? (add === "weight" ? { kind: "weight" } : add === "workout" ? { kind: "workout" } : null);
  const close = () => {
    setDialog(null);
    clearAdd();
  };
  const removeWorkout = useApiMutation((id: string) => api(`/fitness/workouts/${id}`, { method: "DELETE" }), { invalidate: [["fitness"]], success: "Workout deleted", onSuccess: close });
  const removeWeight = useApiMutation((id: string) => api(`/fitness/weight/${id}`, { method: "DELETE" }), { invalidate: [["fitness"]], success: "Entry deleted", onSuccess: close });

  const p = progress.data;
  return (
    <>
      <PageHeader
        title="Fitness"
        description="Weight, workouts and strength over time."
        actions={
          <>
            <Button variant="secondary" onClick={() => setDialog({ kind: "weight" })}><Scale className="size-4" /> Log weight</Button>
            <Button onClick={() => setDialog({ kind: "workout" })}><Plus className="size-4" /> Log workout</Button>
          </>
        }
      />
      <Segmented
        className="mb-5"
        label="Fitness section"
        value={tab}
        onChange={setTab}
        options={[{ value: "overview", label: "Overview" }, { value: "workouts", label: "Workouts" }, { value: "exercises", label: "Exercises" }]}
      />

      {tab === "overview" &&
        (progress.isError ? (
          <ErrorState error={progress.error} onRetry={() => progress.refetch()} />
        ) : !p ? (
          <LoadingState rows={4} />
        ) : (
          <div className="grid gap-5">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatCard label="Current weight" icon={Scale} value={p.weight.latest ? `${p.weight.latest} ${p.weight.unit}` : "—"} sub={p.weight.change !== null ? `${p.weight.change > 0 ? "+" : ""}${p.weight.change} ${p.weight.unit} over 12 weeks` : "Log your weight to see a trend"} />
              <StatCard label="Workouts this week" icon={Dumbbell} value={p.workoutsThisWeek} />
              <StatCard label="Avg per week" value={p.averagePerWeek} sub="last 12 weeks" />
              <StatCard label="Personal records" icon={Trophy} value={p.personalRecords.length} sub="exercises tracked" />
            </div>
            <div className="grid gap-5 lg:grid-cols-2">
              <Card>
                <CardHeader title="Weight trend" />
                <CardContent>
                  {p.weight.series.length < 2 ? (
                    <EmptyState icon={Scale} title="Not enough entries yet" description="Log your weight a few times to see the trend." />
                  ) : (
                    <ChartFrame summary={`Body weight over time, latest ${p.weight.latest} ${p.weight.unit}`} columns={["Date", `Weight (${p.weight.unit})`]} rows={p.weight.series.map((d) => [formatDateKey(d.date), d.weight])}>
                      <LineSeriesChart data={p.weight.series} xKey="date" xFormat={(k) => formatDateKey(k)} format={(v) => formatNumber(v, 1)} series={[{ key: "weight", label: "Weight", color: "var(--series-1)" }]} />
                    </ChartFrame>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader title="Workouts per week" />
                <CardContent>
                  <ChartFrame summary="Workouts per week, last 12 weeks" columns={["Week of", "Workouts", "Volume"]} rows={p.weekly.map((w) => [formatDateKey(w.week), w.workouts, formatNumber(w.volume)])}>
                    <BarSeriesChart data={p.weekly} xKey="week" xFormat={(k) => formatDateKey(k)} series={[{ key: "workouts", label: "Workouts", color: "var(--series-1)" }]} />
                  </ChartFrame>
                </CardContent>
              </Card>
            </div>
            <Card>
              <CardHeader title="Personal records" description="Estimated one-rep max (Epley) from completed sets" />
              <CardContent>
                {p.personalRecords.length ? (
                  <table className="tabular w-full text-sm">
                    <thead className="text-left text-text-3">
                      <tr><th className="py-2 font-medium">Exercise</th><th className="py-2 font-medium">Heaviest</th><th className="py-2 font-medium">Est. 1RM</th><th className="hidden py-2 font-medium sm:table-cell">Achieved</th></tr>
                    </thead>
                    <tbody>
                      {p.personalRecords.map((r) => (
                        <tr key={r.exerciseId} className="border-t border-border">
                          <td className="py-2 font-medium">{r.name}</td>
                          <td className="py-2">{r.maxWeight} kg</td>
                          <td className="py-2">{r.bestOneRepMax} kg</td>
                          <td className="hidden py-2 text-text-3 sm:table-cell">{formatDate(r.achievedAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <EmptyState icon={Trophy} title="No records yet" description="Log sets with weight and reps to track strength." />
                )}
              </CardContent>
            </Card>
          </div>
        ))}

      {tab === "workouts" && (
        <div className="grid gap-5 lg:grid-cols-[1fr_18rem]">
          <Card>
            <CardHeader title="Workout history" />
            <CardContent className="pt-2">
              {workouts.isError ? (
                <ErrorState error={workouts.error} />
              ) : !workouts.data ? (
                <LoadingState className="p-0" />
              ) : !workouts.data.length ? (
                <EmptyState icon={Dumbbell} title="No workouts logged" action={<Button onClick={() => setDialog({ kind: "workout" })}>Log a workout</Button>} />
              ) : (
                <ul className="divide-y divide-border">
                  {workouts.data.map((w) => (
                    <li key={w.id} className="py-3">
                      <div className="flex items-start gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium">{w.name}</p>
                          <p className="text-xs text-text-3">
                            {formatDateTime(w.startedAt)}
                            {w.durationMinutes ? ` · ${w.durationMinutes} min` : ""} · {w.totalSets} sets{w.volume ? ` · ${formatNumber(w.volume)} kg volume` : ""}
                          </p>
                          {w.exercises.length > 0 && <p className="mt-1 truncate text-sm text-text-2">{w.exercises.map((e) => `${e.exercise.name} ${e.sets.length}×`).join(" · ")}</p>}
                        </div>
                        <Button size="icon-sm" variant="ghost" aria-label={`Edit ${w.name}`} onClick={() => setDialog({ kind: "workout", workout: w })}><Pencil className="size-4" /></Button>
                        <Button size="icon-sm" variant="ghost" aria-label={`Delete ${w.name}`} onClick={() => setDialog({ kind: "delete-workout", workout: w })}><Trash2 className="size-4" /></Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader title="Weight log" />
            <CardContent className="pt-2">
              {!weights.data?.length ? (
                <p className="text-sm text-text-3">No entries.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {weights.data.slice(0, 20).map((w) => (
                    <li key={w.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                      <span className="tabular font-medium">{w.weight} {w.unit}</span>
                      <span className="text-xs text-text-3">{formatDate(w.recordedAt, { month: "short", day: "numeric" })}</span>
                      <Button size="icon-sm" variant="ghost" aria-label={`Delete entry ${w.weight} ${w.unit}`} onClick={() => setDialog({ kind: "delete-weight", log: w })}><Trash2 className="size-3.5" /></Button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {tab === "exercises" && <ExerciseLibrary />}

      {activeDialog?.kind === "weight" && <WeightDialog onClose={close} />}
      {activeDialog?.kind === "workout" && <WorkoutDialog workout={activeDialog.workout} onClose={close} />}
      <ConfirmDialog open={activeDialog?.kind === "delete-workout"} title="Delete workout?" message="Its exercises and sets will be removed." loading={removeWorkout.isPending} onConfirm={() => activeDialog?.kind === "delete-workout" && removeWorkout.mutate(activeDialog.workout.id)} onClose={close} />
      <ConfirmDialog open={activeDialog?.kind === "delete-weight"} title="Delete weight entry?" message="This cannot be undone." loading={removeWeight.isPending} onConfirm={() => activeDialog?.kind === "delete-weight" && removeWeight.mutate(activeDialog.log.id)} onClose={close} />
    </>
  );
}
