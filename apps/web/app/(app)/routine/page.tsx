"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarCheck, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { ChartFrame } from "@/components/charts/chart-frame";
import { BarSeriesChart } from "@/components/charts/charts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm";
import { Dialog, DialogActions } from "@/components/ui/dialog";
import { Field, FormRow } from "@/components/ui/field";
import { Input, Select, Textarea } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { useApi, useApiMutation } from "@/hooks/use-api";
import { api } from "@/lib/api";
import { formatDateKey } from "@/lib/format";
import { compact, toOptionalNumber } from "@/lib/utils";
import type { Routine, RoutineItem } from "@/types/api";

const DAYS = [
  ["MO", "Mon"],
  ["TU", "Tue"],
  ["WE", "Wed"],
  ["TH", "Thu"],
  ["FR", "Fri"],
  ["SA", "Sat"],
  ["SU", "Sun"],
] as const;

function describeRule(rule: string | null) {
  if (!rule || rule === "DAILY") return "Every day";
  if (rule === "WEEKDAYS") return "Weekdays";
  if (rule === "WEEKENDS") return "Weekends";
  return rule.slice(7).split(",").map((code) => DAYS.find(([c]) => c === code)?.[1]).join(", ");
}

const routineSchema = z.object({ name: z.string().trim().min(1, "Required").max(120), description: z.string().max(2000).optional() });

function RoutineDialog({ routine, onClose }: { routine?: Routine; onClose: () => void }) {
  const form = useForm({ resolver: zodResolver(routineSchema), defaultValues: { name: routine?.name ?? "", description: routine?.description ?? "" } });
  const save = useApiMutation(
    (values: z.infer<typeof routineSchema>) =>
      routine ? api(`/routines/${routine.id}`, { method: "PATCH", body: values }) : api("/routines", { method: "POST", body: compact(values) }),
    { invalidate: [["routine"]], success: routine ? "Routine updated" : "Routine created", onSuccess: onClose },
  );
  return (
    <Dialog open onClose={onClose} title={routine ? "Edit routine" : "New routine"} description="A routine groups the time blocks of your day, e.g. Morning or Workday.">
      <form onSubmit={form.handleSubmit((v) => save.mutate(v))} className="grid gap-4">
        <Field label="Name" error={form.formState.errors.name?.message}>
          <Input autoFocus placeholder="Morning routine" {...form.register("name")} />
        </Field>
        <Field label="Description">
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

const itemSchema = z
  .object({
    title: z.string().trim().min(1, "Required").max(120),
    category: z.string().max(50).optional(),
    startTime: z.string().optional(),
    endTime: z.string().optional(),
    repeat: z.enum(["DAILY", "WEEKDAYS", "WEEKENDS", "CUSTOM"]),
    days: z.array(z.string()),
    priority: z.preprocess(toOptionalNumber, z.number().int().min(1).max(5).optional()),
    description: z.string().max(2000).optional(),
  })
  .refine((v) => !v.startTime || !v.endTime || v.endTime > v.startTime, { path: ["endTime"], message: "End must be after start" })
  .refine((v) => v.repeat !== "CUSTOM" || v.days.length > 0, { path: ["days"], message: "Pick at least one day" });

function ItemDialog({ routineId, item, onClose }: { routineId: string; item?: RoutineItem; onClose: () => void }) {
  const rule = item?.recurrenceRule ?? "DAILY";
  const form = useForm({
    resolver: zodResolver(itemSchema),
    defaultValues: {
      title: item?.title ?? "",
      category: item?.category ?? "",
      startTime: item?.startTime ?? "",
      endTime: item?.endTime ?? "",
      repeat: (rule.startsWith("WEEKLY:") ? "CUSTOM" : rule) as "DAILY" | "WEEKDAYS" | "WEEKENDS" | "CUSTOM",
      days: rule.startsWith("WEEKLY:") ? rule.slice(7).split(",") : [],
      priority: item?.priority ?? undefined,
      description: item?.description ?? "",
    },
  });
  const repeat = form.watch("repeat");
  const save = useApiMutation(
    ({ repeat, days, ...values }: z.output<typeof itemSchema>) => {
      // Cleared optional fields are sent as null so edits can remove them.
      const body = {
        title: values.title,
        description: values.description || null,
        category: values.category || null,
        startTime: values.startTime || null,
        endTime: values.endTime || null,
        priority: values.priority ?? null,
        recurrenceRule: repeat === "CUSTOM" ? `WEEKLY:${DAYS.map(([c]) => c).filter((c) => days.includes(c)).join(",")}` : repeat,
      };
      return item ? api(`/routines/items/${item.id}`, { method: "PATCH", body }) : api(`/routines/${routineId}/items`, { method: "POST", body });
    },
    { invalidate: [["routine"]], success: item ? "Item updated" : "Item added", onSuccess: onClose },
  );
  const errors = form.formState.errors;
  return (
    <Dialog open onClose={onClose} title={item ? "Edit time block" : "Add time block"}>
      <form onSubmit={form.handleSubmit((v) => save.mutate(v))} className="grid gap-4">
        <Field label="Title" error={errors.title?.message}>
          <Input autoFocus placeholder="Deep work" {...form.register("title")} />
        </Field>
        <FormRow>
          <Field label="Start" error={errors.startTime?.message}>
            <Input type="time" {...form.register("startTime")} />
          </Field>
          <Field label="End" error={errors.endTime?.message}>
            <Input type="time" {...form.register("endTime")} />
          </Field>
        </FormRow>
        <FormRow>
          <Field label="Repeats">
            <Select {...form.register("repeat")}>
              <option value="DAILY">Every day</option>
              <option value="WEEKDAYS">Weekdays</option>
              <option value="WEEKENDS">Weekends</option>
              <option value="CUSTOM">Specific days</option>
            </Select>
          </Field>
          <Field label="Category">
            <Input placeholder="Health, Work…" {...form.register("category")} />
          </Field>
        </FormRow>
        {repeat === "CUSTOM" && (
          <fieldset>
            <legend className="mb-1.5 text-sm font-medium text-text-2">Days</legend>
            <div className="flex flex-wrap gap-2">
              {DAYS.map(([code, label]) => (
                <label key={code} className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-sm has-checked:border-accent has-checked:bg-accent-soft">
                  <input type="checkbox" value={code} className="accent-[var(--accent)]" {...form.register("days")} />
                  {label}
                </label>
              ))}
            </div>
            {errors.days && <p className="mt-1 text-xs text-danger">{errors.days.message}</p>}
          </fieldset>
        )}
        <Field label="Priority (1–5)" error={errors.priority?.message}>
          <Input type="number" min={1} max={5} {...form.register("priority")} />
        </Field>
        <DialogActions>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={save.isPending}>Save</Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

type DialogState =
  | { kind: "routine"; routine?: Routine }
  | { kind: "item"; routineId: string; item?: RoutineItem }
  | { kind: "delete-routine"; routine: Routine }
  | { kind: "delete-item"; item: RoutineItem }
  | null;

export default function RoutinePage() {
  const routines = useApi<Routine[]>(["routine", "list"], "/routines");
  const history = useApi<{ date: string; scheduled: number; completed: number; rate: number }[]>(["routine", "history"], "/routines/history");
  const [dialog, setDialog] = useState<DialogState>(null);
  const close = () => setDialog(null);

  const toggleActive = useApiMutation((r: Routine) => api(`/routines/${r.id}`, { method: "PATCH", body: { isActive: !r.isActive } }), { invalidate: [["routine"]] });
  const removeRoutine = useApiMutation((id: string) => api(`/routines/${id}`, { method: "DELETE" }), { invalidate: [["routine"]], success: "Routine deleted", onSuccess: close });
  const removeItem = useApiMutation((id: string) => api(`/routines/items/${id}`, { method: "DELETE" }), { invalidate: [["routine"]], success: "Item removed", onSuccess: close });

  return (
    <>
      <PageHeader
        title="Routine"
        description="Design your days as time blocks. Check them off from Today."
        actions={<Button onClick={() => setDialog({ kind: "routine" })}><Plus className="size-4" /> New routine</Button>}
      />

      {routines.isError ? (
        <ErrorState error={routines.error} onRetry={() => routines.refetch()} />
      ) : !routines.data ? (
        <LoadingState />
      ) : !routines.data.length ? (
        <Card>
          <EmptyState icon={CalendarCheck} title="No routines yet" description="Start with a morning routine — a few time blocks you want to do most days." action={<Button onClick={() => setDialog({ kind: "routine" })}>Create routine</Button>} />
        </Card>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {routines.data.map((routine) => (
            <Card key={routine.id} className={routine.isActive ? undefined : "opacity-70"}>
              <CardHeader
                title={<span className="flex items-center gap-2">{routine.name}{!routine.isActive && <Badge>Paused</Badge>}</span>}
                description={routine.description ?? `${routine.routineItems.length} time blocks`}
                action={
                  <>
                    <Button size="sm" variant="ghost" onClick={() => toggleActive.mutate(routine)}>{routine.isActive ? "Pause" : "Resume"}</Button>
                    <Button size="icon-sm" variant="ghost" aria-label={`Edit ${routine.name}`} onClick={() => setDialog({ kind: "routine", routine })}><Pencil className="size-4" /></Button>
                    <Button size="icon-sm" variant="ghost" aria-label={`Delete ${routine.name}`} onClick={() => setDialog({ kind: "delete-routine", routine })}><Trash2 className="size-4" /></Button>
                  </>
                }
              />
              <CardContent className="pt-3">
                {routine.routineItems.length ? (
                  <ul className="divide-y divide-border">
                    {routine.routineItems.map((item) => (
                      <li key={item.id} className="group flex items-center gap-3 py-2.5">
                        <span className="tabular w-24 shrink-0 text-xs text-text-3">{item.startTime ? `${item.startTime}${item.endTime ? `–${item.endTime}` : ""}` : "Anytime"}</span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{item.title}</p>
                          <p className="truncate text-xs text-text-3">{describeRule(item.recurrenceRule)}{item.category ? ` · ${item.category}` : ""}</p>
                        </div>
                        <Button size="icon-sm" variant="ghost" aria-label={`Edit ${item.title}`} onClick={() => setDialog({ kind: "item", routineId: routine.id, item })}><MoreHorizontal className="size-4" /></Button>
                        <Button size="icon-sm" variant="ghost" aria-label={`Remove ${item.title}`} onClick={() => setDialog({ kind: "delete-item", item })}><Trash2 className="size-4" /></Button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="py-2 text-sm text-text-3">No time blocks yet.</p>
                )}
                <Button variant="soft" size="sm" className="mt-3" onClick={() => setDialog({ kind: "item", routineId: routine.id })}><Plus className="size-4" /> Add time block</Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {history.data && history.data.some((d) => d.scheduled > 0) && (
        <Card className="mt-5">
          <CardHeader title="Completion, last 30 days" description="Share of scheduled time blocks completed each day" />
          <CardContent>
            <ChartFrame summary="Daily routine completion rate for the last 30 days" columns={["Date", "Completed", "Scheduled", "Rate"]} rows={history.data.map((d) => [formatDateKey(d.date), d.completed, d.scheduled, `${d.rate}%`])}>
              <BarSeriesChart data={history.data} xKey="date" xFormat={(k) => formatDateKey(k)} format={(v) => `${v}%`} series={[{ key: "rate", label: "Completion", color: "var(--series-1)" }]} yDomain={[0, 100]} />
            </ChartFrame>
          </CardContent>
        </Card>
      )}

      {dialog?.kind === "routine" && <RoutineDialog routine={dialog.routine} onClose={close} />}
      {dialog?.kind === "item" && <ItemDialog routineId={dialog.routineId} item={dialog.item} onClose={close} />}
      <ConfirmDialog open={dialog?.kind === "delete-routine"} title="Delete routine?" message="This removes the routine, its time blocks and their history." loading={removeRoutine.isPending} onConfirm={() => dialog?.kind === "delete-routine" && removeRoutine.mutate(dialog.routine.id)} onClose={close} />
      <ConfirmDialog open={dialog?.kind === "delete-item"} title="Remove time block?" message="Its completion history will be removed too." confirmLabel="Remove" loading={removeItem.isPending} onConfirm={() => dialog?.kind === "delete-item" && removeItem.mutate(dialog.item.id)} onClose={close} />
    </>
  );
}
