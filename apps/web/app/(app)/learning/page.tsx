"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronDown, Flame, GraduationCap, Pause, Pencil, Play, Plus, Timer, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { ChartFrame } from "@/components/charts/chart-frame";
import { BarSeriesChart, RankedBars } from "@/components/charts/charts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm";
import { Dialog, DialogActions } from "@/components/ui/dialog";
import { Field, FormRow } from "@/components/ui/field";
import { Input, Select, Textarea } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Progress } from "@/components/ui/progress";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { StatCard } from "@/components/ui/stat-card";
import { useAddParam } from "@/hooks/use-add-param";
import { useApi, useApiMutation } from "@/hooks/use-api";
import { api } from "@/lib/api";
import { formatDate, formatDateKey, formatDateTime, formatMinutes, humanize, isoToLocalInput, localInputToIso, nowForInput, weekdayShort } from "@/lib/format";
import { useStudyTimer } from "@/lib/timer-store";
import { cn, toOptionalNumber } from "@/lib/utils";
import type { LearningGoal, LearningSession, LearningStats, LearningStatus, LearningTopic } from "@/types/api";

const STATUSES: LearningStatus[] = ["ACTIVE", "PAUSED", "COMPLETED", "ARCHIVED"];
const STATUS_TONE = { ACTIVE: "accent", PAUSED: "warning", COMPLETED: "success", ARCHIVED: "neutral" } as const;

// ─── Goal dialog ────────────────────────────────────────────────────────────
const goalSchema = z.object({
  name: z.string().trim().min(1, "Required").max(120),
  category: z.string().trim().min(1, "Required").max(50),
  description: z.string().max(2000).optional(),
  targetDate: z.string().optional(),
  status: z.enum(["ACTIVE", "PAUSED", "COMPLETED", "ARCHIVED"]),
});

function GoalDialog({ goal, onClose }: { goal?: LearningGoal; onClose: () => void }) {
  const form = useForm({
    resolver: zodResolver(goalSchema),
    defaultValues: { name: goal?.name ?? "", category: goal?.category ?? "", description: goal?.description ?? "", targetDate: goal?.targetDate?.slice(0, 10) ?? "", status: goal?.status ?? "ACTIVE" },
  });
  const save = useApiMutation(
    (v: z.output<typeof goalSchema>) => {
      const body = { ...v, description: v.description || undefined, targetDate: v.targetDate || undefined };
      return goal ? api(`/learning/goals/${goal.id}`, { method: "PATCH", body }) : api("/learning/goals", { method: "POST", body });
    },
    { invalidate: [["learning"]], success: goal ? "Goal updated" : "Goal created", onSuccess: onClose },
  );
  const errors = form.formState.errors;
  return (
    <Dialog open onClose={onClose} title={goal ? "Edit learning goal" : "New learning goal"}>
      <form onSubmit={form.handleSubmit((v) => save.mutate(v))} className="grid gap-4">
        <Field label="What are you learning?" error={errors.name?.message}>
          <Input autoFocus placeholder="Data structures & algorithms" {...form.register("name")} />
        </Field>
        <FormRow>
          <Field label="Category" error={errors.category?.message}>
            <Input placeholder="Programming, Music…" {...form.register("category")} />
          </Field>
          <Field label="Target date">
            <Input type="date" {...form.register("targetDate")} />
          </Field>
        </FormRow>
        {goal && (
          <Field label="Status">
            <Select {...form.register("status")}>
              {STATUSES.map((s) => <option key={s} value={s}>{humanize(s)}</option>)}
            </Select>
          </Field>
        )}
        <Field label="Notes">
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

// ─── Session dialog ─────────────────────────────────────────────────────────
const sessionSchema = z
  .object({
    learningGoalId: z.string().min(1, "Choose a goal"),
    learningTopicId: z.string().optional(),
    startedAt: z.string().min(1),
    endedAt: z.string().min(1),
    productivityRating: z.preprocess(toOptionalNumber, z.number().int().min(1).max(5).optional()),
    notes: z.string().max(2000).optional(),
  })
  .refine((v) => new Date(v.endedAt).getTime() - new Date(v.startedAt).getTime() >= 60_000, { path: ["endedAt"], message: "Session must be at least one minute" });

function SessionDialog({ goals, initial, onClose, onSaved }: { goals: LearningGoal[]; initial?: { goalId?: string | null; topicId?: string | null; startedAt?: string }; onClose: () => void; onSaved?: () => void }) {
  const form = useForm({
    resolver: zodResolver(sessionSchema),
    defaultValues: {
      learningGoalId: initial?.goalId ?? goals.find((g) => g.status === "ACTIVE")?.id ?? "",
      learningTopicId: initial?.topicId ?? "",
      startedAt: initial?.startedAt ? isoToLocalInput(initial.startedAt) : nowForInput(-30),
      endedAt: nowForInput(),
      productivityRating: undefined,
      notes: "",
    },
  });
  const goalId = form.watch("learningGoalId");
  const topics = goals.find((g) => g.id === goalId)?.topics ?? [];
  const save = useApiMutation(
    (v: z.output<typeof sessionSchema>) =>
      api("/learning/sessions", {
        method: "POST",
        body: { ...v, learningTopicId: v.learningTopicId || undefined, notes: v.notes || undefined, startedAt: localInputToIso(v.startedAt), endedAt: localInputToIso(v.endedAt) },
      }),
    { invalidate: [["learning"]], success: "Session logged", onSuccess: () => { onSaved?.(); onClose(); } },
  );
  const errors = form.formState.errors;
  return (
    <Dialog open onClose={onClose} title="Log study session">
      <form onSubmit={form.handleSubmit((v) => save.mutate(v))} className="grid gap-4">
        <FormRow>
          <Field label="Goal" error={errors.learningGoalId?.message}>
            <Select {...form.register("learningGoalId")}>
              <option value="">Choose…</option>
              {goals.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </Select>
          </Field>
          <Field label="Topic (optional)">
            <Select {...form.register("learningTopicId")} disabled={!topics.length}>
              <option value="">—</option>
              {topics.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </Select>
          </Field>
        </FormRow>
        <FormRow>
          <Field label="Started">
            <Input type="datetime-local" {...form.register("startedAt")} />
          </Field>
          <Field label="Ended" error={errors.endedAt?.message}>
            <Input type="datetime-local" {...form.register("endedAt")} />
          </Field>
        </FormRow>
        <Field label="How focused were you? (1–5)" error={errors.productivityRating?.message}>
          <Select {...form.register("productivityRating")}>
            <option value="">Skip</option>
            {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n} — {["scattered", "distracted", "okay", "focused", "deep focus"][n - 1]}</option>)}
          </Select>
        </Field>
        <Field label="Notes">
          <Textarea placeholder="What did you cover?" {...form.register("notes")} />
        </Field>
        <DialogActions>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={save.isPending}>Save session</Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

// ─── Timer ──────────────────────────────────────────────────────────────────
function useElapsed(startedAt: string | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!startedAt) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [startedAt]);
  if (!startedAt) return "00:00";
  const total = Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

function StudyTimer({ goals, onStop }: { goals: LearningGoal[]; onStop: (session: { goalId: string | null; topicId: string | null; startedAt: string }) => void }) {
  const timer = useStudyTimer();
  const [goalId, setGoalId] = useState(timer.goalId ?? goals.find((g) => g.status === "ACTIVE")?.id ?? "");
  const [topicId, setTopicId] = useState(timer.topicId ?? "");
  const elapsed = useElapsed(timer.startedAt);
  const running = Boolean(timer.startedAt);
  const goal = goals.find((g) => g.id === (running ? timer.goalId : goalId));
  return (
    <Card>
      <CardHeader title="Study timer" description={running ? `Studying ${goal?.name ?? ""}` : "Start a focused session — it keeps running if you reload."} />
      <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <p className="tabular text-4xl font-semibold tracking-tight" aria-live="off" aria-label={`Elapsed ${elapsed}`}>{elapsed}</p>
        {!running && (
          <div className="grid flex-1 gap-3 sm:grid-cols-2">
            <Select aria-label="Goal" value={goalId} onChange={(e) => { setGoalId(e.target.value); setTopicId(""); }}>
              <option value="">Choose a goal…</option>
              {goals.filter((g) => g.status === "ACTIVE").map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </Select>
            <Select aria-label="Topic" value={topicId} onChange={(e) => setTopicId(e.target.value)} disabled={!goal?.topics.length}>
              <option value="">Any topic</option>
              {goal?.topics.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </Select>
          </div>
        )}
        <div className="flex gap-2 sm:ml-auto">
          {running ? (
            <>
              <Button variant="ghost" onClick={timer.reset}>Discard</Button>
              <Button onClick={() => onStop({ goalId: timer.goalId, topicId: timer.topicId, startedAt: timer.startedAt! })}><Pause className="size-4" /> Stop & log</Button>
            </>
          ) : (
            <Button disabled={!goalId} onClick={() => timer.start(goalId, topicId || null)}><Play className="size-4" /> Start</Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Goal card ──────────────────────────────────────────────────────────────
function GoalCard({ goal, onEdit, onDelete }: { goal: LearningGoal; onEdit: () => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  const [topicName, setTopicName] = useState("");
  const addTopic = useApiMutation((name: string) => api(`/learning/goals/${goal.id}/topics`, { method: "POST", body: { name } }), { invalidate: [["learning"]], onSuccess: () => setTopicName("") });
  const updateTopic = useApiMutation(({ id, ...body }: Partial<LearningTopic> & { id: string }) => api(`/learning/topics/${id}`, { method: "PATCH", body }), { invalidate: [["learning"]] });
  const removeTopic = useApiMutation((id: string) => api(`/learning/topics/${id}`, { method: "DELETE" }), { invalidate: [["learning"]] });
  return (
    <Card>
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <p className="flex flex-wrap items-center gap-2 font-medium">
              {goal.name} <Badge tone={STATUS_TONE[goal.status]}>{humanize(goal.status)}</Badge>
            </p>
            <p className="mt-0.5 text-xs text-text-3">
              {goal.category} · {formatMinutes(goal.totalMinutes)} over {goal.sessionCount} session{goal.sessionCount === 1 ? "" : "s"}
              {goal.targetDate ? ` · target ${formatDate(goal.targetDate)}` : ""}
            </p>
          </div>
          <Button size="icon-sm" variant="ghost" aria-label={`Edit ${goal.name}`} onClick={onEdit}><Pencil className="size-4" /></Button>
          <Button size="icon-sm" variant="ghost" aria-label={`Delete ${goal.name}`} onClick={onDelete}><Trash2 className="size-4" /></Button>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <Progress value={goal.progress} label={`${goal.name} progress`} />
          <span className="tabular w-10 text-right text-sm text-text-2">{goal.progress}%</span>
        </div>
        <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="mt-3 inline-flex items-center gap-1 text-sm text-text-2 hover:text-accent">
          <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} aria-hidden /> {goal.topics.length} topic{goal.topics.length === 1 ? "" : "s"}
        </button>
      </div>
      {open && (
        <div className="border-t border-border px-4 py-3">
          <ul className="grid gap-2">
            {goal.topics.map((topic) => (
              <li key={topic.id} className="flex flex-wrap items-center gap-2 text-sm">
                <span className={cn("min-w-0 flex-1 truncate", topic.status === "COMPLETED" && "text-text-3 line-through")}>{topic.name}</span>
                <Select aria-label={`${topic.name} progress`} className="h-8 w-24 text-xs" value={topic.progress} onChange={(e) => updateTopic.mutate({ id: topic.id, progress: Number(e.target.value), status: Number(e.target.value) === 100 ? "COMPLETED" : "ACTIVE" })}>
                  {[0, 25, 50, 75, 100].map((n) => <option key={n} value={n}>{n}%</option>)}
                </Select>
                <Button size="icon-sm" variant="ghost" aria-label={`Remove topic ${topic.name}`} onClick={() => removeTopic.mutate(topic.id)}><Trash2 className="size-3.5" /></Button>
              </li>
            ))}
          </ul>
          <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (topicName.trim()) addTopic.mutate(topicName.trim()); }}>
            <Input aria-label="New topic" placeholder="Add a topic…" value={topicName} onChange={(e) => setTopicName(e.target.value)} className="h-9" maxLength={120} />
            <Button type="submit" size="sm" variant="secondary" loading={addTopic.isPending}>Add</Button>
          </form>
          <p className="mt-2 text-xs text-text-3">Goal progress is the average of its topics.</p>
        </div>
      )}
    </Card>
  );
}

type DialogState = { kind: "goal"; goal?: LearningGoal } | { kind: "session"; initial?: { goalId: string | null; topicId: string | null; startedAt: string }; fromTimer?: boolean } | { kind: "delete-goal"; goal: LearningGoal } | { kind: "delete-session"; session: LearningSession } | null;

export default function LearningPage() {
  const goals = useApi<LearningGoal[]>(["learning", "goals"], "/learning/goals");
  const stats = useApi<LearningStats>(["learning", "stats"], "/learning/stats");
  const sessions = useApi<LearningSession[]>(["learning", "sessions"], "/learning/sessions?days=30");
  const resetTimer = useStudyTimer((s) => s.reset);
  const [add, clearAdd] = useAddParam();
  const [dialog, setDialog] = useState<DialogState>(null);
  const close = () => { setDialog(null); clearAdd(); };
  const removeGoal = useApiMutation((id: string) => api(`/learning/goals/${id}`, { method: "DELETE" }), { invalidate: [["learning"]], success: "Goal deleted", onSuccess: close });
  const removeSession = useApiMutation((id: string) => api(`/learning/sessions/${id}`, { method: "DELETE" }), { invalidate: [["learning"]], success: "Session deleted", onSuccess: close });

  if (goals.isError) return <ErrorState error={goals.error} onRetry={() => goals.refetch()} />;
  const s = stats.data;
  const goalList = goals.data ?? [];
  const activeDialog: DialogState = dialog ?? (add === "session" ? { kind: "session" } : null);

  return (
    <>
      <PageHeader
        title="Learning"
        description="Goals, topics and focused study time."
        actions={
          <>
            <Button variant="secondary" disabled={!goalList.length} onClick={() => setDialog({ kind: "session" })}><Timer className="size-4" /> Log session</Button>
            <Button onClick={() => setDialog({ kind: "goal" })}><Plus className="size-4" /> New goal</Button>
          </>
        }
      />
      {!goals.data ? (
        <LoadingState rows={4} />
      ) : !goalList.length ? (
        <Card>
          <EmptyState icon={GraduationCap} title="No learning goals yet" description="Add something you're learning — a language, an instrument, a technology." action={<Button onClick={() => setDialog({ kind: "goal" })}>Create a goal</Button>} />
        </Card>
      ) : (
        <div className="grid gap-5">
          <div id="timer" className={cn(add === "timer" && "rounded-xl ring-2 ring-accent")}>
            <StudyTimer goals={goalList} onStop={(initial) => setDialog({ kind: "session", initial, fromTimer: true })} />
          </div>
          {s && (
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatCard label="Today" value={formatMinutes(s.today)} sub={`goal ${formatMinutes(s.dailyGoalMinutes)}`}>
                <Progress className="mt-3" value={s.dailyGoalMinutes ? (s.today / s.dailyGoalMinutes) * 100 : 0} label="Daily study goal" />
              </StatCard>
              <StatCard label="Study streak" icon={Flame} value={`${s.studyStreakDays} day${s.studyStreakDays === 1 ? "" : "s"}`} />
              <StatCard label={`Last ${s.periodDays} days`} value={formatMinutes(s.periodMinutes)} sub={`${s.sessionCount} sessions`} />
              <StatCard label="Avg focus" value={s.averageProductivity ? `${s.averageProductivity}/5` : "—"} sub="self-rated" />
            </div>
          )}
          {s && (
            <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
              <Card>
                <CardHeader title="Study minutes per day" description={`Last ${s.periodDays} days`} />
                <CardContent>
                  <ChartFrame summary={`Study minutes per day, last ${s.periodDays} days`} columns={["Date", "Minutes"]} rows={s.daily.map((d) => [formatDateKey(d.date), d.minutes])}>
                    <BarSeriesChart data={s.daily} xKey="date" xFormat={s.daily.length > 7 ? (k) => formatDateKey(k) : weekdayShort} format={(v) => `${v}m`} series={[{ key: "minutes", label: "Minutes", color: "var(--series-1)" }]} />
                  </ChartFrame>
                </CardContent>
              </Card>
              <Card>
                <CardHeader title="Time by goal" description={`Last ${s.periodDays} days`} />
                <CardContent>{s.byGoal.length ? <RankedBars items={s.byGoal.map((g) => ({ label: g.name, value: g.minutes }))} format={formatMinutes} /> : <p className="text-sm text-text-3">No sessions in this period.</p>}</CardContent>
              </Card>
            </div>
          )}
          <div className="grid gap-3 lg:grid-cols-2">
            {goalList.map((goal) => <GoalCard key={goal.id} goal={goal} onEdit={() => setDialog({ kind: "goal", goal })} onDelete={() => setDialog({ kind: "delete-goal", goal })} />)}
          </div>
          <Card>
            <CardHeader title="Recent sessions" description="Last 30 days" />
            <CardContent className="pt-2">
              {!sessions.data?.length ? (
                <p className="text-sm text-text-3">No sessions yet.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {sessions.data.map((session) => (
                    <li key={session.id} className="flex items-center gap-3 py-2.5 text-sm">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{session.learningGoal.name}{session.learningTopic ? ` · ${session.learningTopic.name}` : ""}</p>
                        <p className="truncate text-xs text-text-3">{formatDateTime(session.startedAt)}{session.notes ? ` · ${session.notes}` : ""}</p>
                      </div>
                      {session.productivityRating && <Badge>{session.productivityRating}/5</Badge>}
                      <span className="tabular shrink-0 text-text-2">{formatMinutes(session.durationMinutes)}</span>
                      <Button size="icon-sm" variant="ghost" aria-label="Delete session" onClick={() => setDialog({ kind: "delete-session", session })}><Trash2 className="size-3.5" /></Button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      )}
      {activeDialog?.kind === "goal" && <GoalDialog goal={activeDialog.goal} onClose={close} />}
      {activeDialog?.kind === "session" && goalList.length > 0 && <SessionDialog goals={goalList} initial={activeDialog.initial} onClose={close} onSaved={activeDialog.fromTimer ? resetTimer : undefined} />}
      <ConfirmDialog open={activeDialog?.kind === "delete-goal"} title="Delete learning goal?" message="Its topics and all study sessions will be deleted." loading={removeGoal.isPending} onConfirm={() => activeDialog?.kind === "delete-goal" && removeGoal.mutate(activeDialog.goal.id)} onClose={close} />
      <ConfirmDialog open={activeDialog?.kind === "delete-session"} title="Delete session?" message="This removes it from your study totals." loading={removeSession.isPending} onConfirm={() => activeDialog?.kind === "delete-session" && removeSession.mutate(activeDialog.session.id)} onClose={close} />
    </>
  );
}
