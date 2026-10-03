"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useInfiniteQuery } from "@tanstack/react-query";
import { AlarmClock, Award, Bell, CalendarClock, CheckCheck, Flag, ListChecks, PiggyBank, Plus, Repeat, Sparkles, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Dialog, DialogActions } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input, Select, Textarea } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { useApi, useApiMutation } from "@/hooks/use-api";
import { api, apiPage } from "@/lib/api";
import { formatDateTime, humanize, localInputToIso, nowForInput, relativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { AppNotification } from "@/types/api";

const ICONS: Record<string, typeof Bell> = {
  HABIT_REMINDER: Repeat,
  TASK_DUE_SOON: ListChecks,
  TASK_OVERDUE: ListChecks,
  PROJECT_DEADLINE: Flag,
  DAILY_REVIEW: Sparkles,
  WEEKLY_REVIEW: Sparkles,
  ACHIEVEMENT: Award,
  SAVINGS_MILESTONE: PiggyBank,
  REMINDER: AlarmClock,
};

const reminderSchema = z.object({
  title: z.string().trim().min(1, "Required").max(120),
  message: z.string().max(2000).optional(),
  scheduledAt: z.string().min(1).refine((v) => new Date(v).getTime() > Date.now(), "Pick a time in the future"),
  priority: z.enum(["CRITICAL", "IMPORTANT", "USEFUL", "OPTIONAL"]),
});

function ReminderDialog({ onClose }: { onClose: () => void }) {
  const form = useForm({ resolver: zodResolver(reminderSchema), defaultValues: { title: "", message: "", scheduledAt: nowForInput(60), priority: "IMPORTANT" as const } });
  const save = useApiMutation((v: z.output<typeof reminderSchema>) => api("/notifications/reminders", { method: "POST", body: { ...v, message: v.message || undefined, scheduledAt: localInputToIso(v.scheduledAt) } }), {
    invalidate: [["notifications"]],
    success: "Reminder scheduled",
    onSuccess: onClose,
  });
  const errors = form.formState.errors;
  return (
    <Dialog open onClose={onClose} title="Schedule a reminder">
      <form onSubmit={form.handleSubmit((v) => save.mutate(v))} className="grid gap-4">
        <Field label="Remind me to" error={errors.title?.message}>
          <Input autoFocus {...form.register("title")} />
        </Field>
        <Field label="When" error={errors.scheduledAt?.message}>
          <Input type="datetime-local" {...form.register("scheduledAt")} />
        </Field>
        <Field label="Priority" hint="Critical reminders are delivered even during quiet hours">
          <Select {...form.register("priority")}>{["CRITICAL", "IMPORTANT", "USEFUL", "OPTIONAL"].map((p) => <option key={p} value={p}>{humanize(p)}</option>)}</Select>
        </Field>
        <Field label="Details">
          <Textarea {...form.register("message")} />
        </Field>
        <DialogActions>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={save.isPending}>Schedule</Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

export default function NotificationsPage() {
  const [creating, setCreating] = useState(false);
  const inbox = useInfiniteQuery({
    queryKey: ["notifications", "inbox"],
    queryFn: ({ pageParam }) => apiPage<AppNotification>("/notifications", { query: { page: pageParam, limit: 20 } }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.meta.page < last.meta.totalPages ? last.meta.page + 1 : undefined),
  });
  const scheduled = useApi<AppNotification[]>(["notifications", "scheduled"], "/notifications/scheduled");
  const markRead = useApiMutation((id: string) => api(`/notifications/${id}/read`, { method: "PATCH" }), { invalidate: [["notifications"]] });
  const markAll = useApiMutation(() => api("/notifications/read-all", { method: "POST" }), { invalidate: [["notifications"]], success: "All caught up" });
  const remove = useApiMutation((id: string) => api(`/notifications/${id}`, { method: "DELETE" }), { invalidate: [["notifications"]] });

  const items = inbox.data?.pages.flatMap((p) => p.data) ?? [];
  const unread = items.filter((n) => n.status === "SENT").length;

  return (
    <>
      <PageHeader
        title="Notifications"
        description={<>Reminders, deadlines, reviews and achievements. Tune what you get in <Link href="/settings#notifications" className="text-accent hover:underline">settings</Link>.</>}
        actions={
          <>
            <Button variant="secondary" disabled={!unread} loading={markAll.isPending} onClick={() => markAll.mutate(undefined)}><CheckCheck className="size-4" /> Mark all read</Button>
            <Button onClick={() => setCreating(true)}><Plus className="size-4" /> Reminder</Button>
          </>
        }
      />
      <div className="grid gap-5 lg:grid-cols-[1fr_20rem]">
        <Card>
          <CardContent className="py-2">
            {inbox.isError ? (
              <ErrorState error={inbox.error} onRetry={() => inbox.refetch()} />
            ) : !inbox.data ? (
              <LoadingState className="p-0" />
            ) : !items.length ? (
              <EmptyState icon={Bell} title="You're all caught up" description="Reminders and achievements will show up here." />
            ) : (
              <ul className="divide-y divide-border">
                {items.map((n) => {
                  const Icon = ICONS[n.type] ?? Bell;
                  const isUnread = n.status === "SENT";
                  return (
                    <li key={n.id} className={cn("flex gap-3 py-3", !isUnread && "opacity-75")}>
                      <span className={cn("grid size-9 shrink-0 place-items-center rounded-lg", isUnread ? "bg-accent-soft text-accent" : "bg-surface-2 text-text-3")} aria-hidden>
                        <Icon className="size-4" />
                      </span>
                      <button type="button" className="min-w-0 flex-1 text-left" onClick={() => isUnread && markRead.mutate(n.id)} aria-label={`${n.title}${isUnread ? ", unread — mark as read" : ""}`}>
                        <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                          {n.title}
                          {isUnread && <Badge tone="accent">New</Badge>}
                          {n.priority === "CRITICAL" && <Badge tone="danger">Critical</Badge>}
                        </p>
                        {n.message && <p className="mt-0.5 text-sm text-text-2">{n.message}</p>}
                        <p className="mt-1 text-xs text-text-3">{humanize(n.type)} · {n.sentAt ? relativeTime(n.sentAt) : ""}</p>
                      </button>
                      <Button size="icon-sm" variant="ghost" aria-label={`Dismiss ${n.title}`} onClick={() => remove.mutate(n.id)}><Trash2 className="size-3.5" /></Button>
                    </li>
                  );
                })}
              </ul>
            )}
            {inbox.hasNextPage && (
              <div className="flex justify-center py-3">
                <Button variant="secondary" size="sm" loading={inbox.isFetchingNextPage} onClick={() => inbox.fetchNextPage()}>Load more</Button>
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader title="Scheduled" description="Waiting to be delivered" />
          <CardContent className="pt-2">
            {!scheduled.data?.length ? (
              <p className="text-sm text-text-3">Nothing scheduled.</p>
            ) : (
              <ul className="divide-y divide-border">
                {scheduled.data.map((n) => (
                  <li key={n.id} className="flex items-start gap-2 py-2.5 text-sm">
                    <CalendarClock className="mt-0.5 size-4 shrink-0 text-text-3" aria-hidden />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{n.title}</p>
                      <p className="text-xs text-text-3">{n.scheduledAt ? formatDateTime(n.scheduledAt) : "Held by quiet hours"}</p>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => remove.mutate(n.id)}>Cancel</Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
      {creating && <ReminderDialog onClose={() => setCreating(false)} />}
    </>
  );
}
