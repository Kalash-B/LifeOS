"use client";

import { ArrowLeft, Flag, Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { MilestoneDialog, ProjectDialog, STATUS_TONE, TASK_STATUSES, TaskDialog } from "@/components/projects/forms";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { CheckButton } from "@/components/ui/check-button";
import { ConfirmDialog } from "@/components/ui/confirm";
import { Input, Select } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { ErrorState, LoadingState } from "@/components/ui/states";
import { useSetTaskStatus } from "@/hooks/use-actions";
import { useApi, useApiMutation } from "@/hooks/use-api";
import { api } from "@/lib/api";
import { formatDate, humanize, isOverdue } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Milestone, ProjectDetail, Task } from "@/types/api";

type DialogState = { kind: "project" } | { kind: "task"; task?: Task } | { kind: "milestone"; milestone?: Milestone } | { kind: "delete-project" } | { kind: "delete-task"; task: Task } | null;

const COLUMNS = [
  { title: "To do", statuses: ["BACKLOG", "TODO"] },
  { title: "In progress", statuses: ["IN_PROGRESS", "BLOCKED"] },
  { title: "Done", statuses: ["COMPLETED"] },
];

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const project = useApi<ProjectDetail>(["projects", id], `/projects/${id}`);
  const [dialog, setDialog] = useState<DialogState>(null);
  const [quickTitle, setQuickTitle] = useState("");
  const close = () => setDialog(null);
  const setStatus = useSetTaskStatus();
  const quickAdd = useApiMutation((title: string) => api(`/projects/${id}/tasks`, { method: "POST", body: { title } }), { invalidate: [["projects"], ["tasks"]], onSuccess: () => setQuickTitle("") });
  const removeProject = useApiMutation(() => api(`/projects/${id}`, { method: "DELETE" }), { invalidate: [["projects"]], success: "Project deleted", onSuccess: () => router.replace("/projects") });
  const removeTask = useApiMutation((taskId: string) => api(`/tasks/${taskId}`, { method: "DELETE" }), { invalidate: [["projects"], ["tasks"]], success: "Task deleted", onSuccess: close });
  const removeMilestone = useApiMutation((mid: string) => api(`/milestones/${mid}`, { method: "DELETE" }), { invalidate: [["projects"]] });

  if (project.isError) return <ErrorState error={project.error} onRetry={() => project.refetch()} />;
  if (!project.data) return <LoadingState rows={6} />;
  const p = project.data;

  return (
    <>
      <Link href="/projects" className="mb-4 inline-flex items-center gap-1 text-sm text-text-3 hover:text-accent"><ArrowLeft className="size-4" aria-hidden /> Projects</Link>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="flex flex-wrap items-center gap-2 text-2xl font-semibold tracking-tight">{p.name} <Badge tone={STATUS_TONE[p.status]}>{humanize(p.status)}</Badge></h1>
          <p className="mt-1 text-sm text-text-3">
            {humanize(p.category)}{p.priority ? ` · ${humanize(p.priority)} priority` : ""}{p.startDate ? ` · started ${formatDate(p.startDate)}` : ""}{p.deadline ? ` · due ${formatDate(p.deadline)}` : ""}
          </p>
          {p.description && <p className="mt-3 max-w-2xl text-sm text-text-2">{p.description}</p>}
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setDialog({ kind: "project" })}><Pencil className="size-4" /> Edit</Button>
          <Button variant="ghost" size="icon" aria-label="Delete project" onClick={() => setDialog({ kind: "delete-project" })}><Trash2 className="size-4" /></Button>
        </div>
      </div>

      <Card className="mb-5 p-5">
        <div className="mb-2 flex justify-between text-sm">
          <span className="text-text-2">{p.autoProgress ? "Progress from completed tasks" : "Progress (set manually)"}</span>
          <span className="tabular font-semibold">{p.progress}%</span>
        </div>
        <Progress value={p.progress} label="Project progress" />
      </Card>

      <form className="mb-5 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (quickTitle.trim()) quickAdd.mutate(quickTitle.trim()); }}>
        <Input aria-label="Quick add task" placeholder="Add a task and press Enter…" value={quickTitle} onChange={(e) => setQuickTitle(e.target.value)} maxLength={200} />
        <Button type="submit" loading={quickAdd.isPending}><Plus className="size-4" /> Add</Button>
        <Button variant="secondary" onClick={() => setDialog({ kind: "task" })}>Details…</Button>
      </form>

      <div className="grid gap-4 lg:grid-cols-3">
        {COLUMNS.map((column) => {
          const tasks = p.tasks.filter((t) => column.statuses.includes(t.status));
          return (
            <section key={column.title} aria-labelledby={`col-${column.title}`} className="rounded-xl border border-border bg-surface-2/60 p-3">
              <h2 id={`col-${column.title}`} className="mb-3 flex items-center justify-between px-1 text-sm font-semibold">
                {column.title} <span className="tabular text-xs font-normal text-text-3">{tasks.length}</span>
              </h2>
              <ul className="grid gap-2">
                {tasks.map((task) => {
                  const done = task.status === "COMPLETED";
                  const overdue = isOverdue(task.dueDate, done);
                  return (
                    <li key={task.id} className="rounded-lg border border-border bg-surface p-3">
                      <div className="flex items-start gap-2.5">
                        <CheckButton checked={done} label={`${task.title}${done ? " (completed)" : ""}`} onToggle={() => setStatus.mutate({ taskId: task.id, status: done ? "TODO" : "COMPLETED" })} />
                        <button type="button" onClick={() => setDialog({ kind: "task", task })} className={cn("min-w-0 flex-1 text-left text-sm font-medium hover:text-accent", done && "text-text-3 line-through")}>{task.title}</button>
                        <Button size="icon-sm" variant="ghost" className="-mr-1 -mt-1" aria-label={`Delete ${task.title}`} onClick={() => setDialog({ kind: "delete-task", task })}><Trash2 className="size-3.5" /></Button>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2 pl-8">
                        <Select aria-label={`Status of ${task.title}`} className="h-7 w-auto py-0 text-xs" value={task.status} onChange={(e) => setStatus.mutate({ taskId: task.id, status: e.target.value })}>
                          {TASK_STATUSES.map((s) => <option key={s} value={s}>{humanize(s)}</option>)}
                        </Select>
                        {task.priority && <Badge tone={task.priority === "URGENT" ? "danger" : task.priority === "HIGH" ? "warning" : "neutral"}>{humanize(task.priority)}</Badge>}
                        {task.dueDate && <span className={cn("text-xs", overdue ? "font-medium text-danger" : "text-text-3")}>{overdue ? "Overdue · " : ""}{formatDate(task.dueDate, { month: "short", day: "numeric" })}</span>}
                      </div>
                    </li>
                  );
                })}
                {!tasks.length && <li className="px-1 py-4 text-center text-xs text-text-3">No tasks</li>}
              </ul>
            </section>
          );
        })}
      </div>

      <Card className="mt-5">
        <CardHeader title="Milestones" action={<Button size="sm" variant="soft" onClick={() => setDialog({ kind: "milestone" })}><Plus className="size-4" /> Add</Button>} />
        <CardContent className="pt-2">
          {!p.milestones.length ? (
            <p className="text-sm text-text-3">No milestones yet.</p>
          ) : (
            <ol className="relative grid gap-4 border-l border-border pl-5">
              {p.milestones.map((m) => (
                <li key={m.id} className="relative">
                  <span className={cn("absolute -left-[27px] top-0.5 grid size-4 place-items-center rounded-full border-2", m.status === "COMPLETED" ? "border-accent bg-accent" : "border-border-strong bg-surface")} aria-hidden />
                  <div className="flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-2 text-sm font-medium"><Flag className="size-3.5 text-text-3" aria-hidden />{m.name}</p>
                      <p className="text-xs text-text-3">{humanize(m.status)}{m.targetDate ? ` · ${formatDate(m.targetDate)}` : ""}</p>
                    </div>
                    <Button size="icon-sm" variant="ghost" aria-label={`Edit ${m.name}`} onClick={() => setDialog({ kind: "milestone", milestone: m })}><Pencil className="size-3.5" /></Button>
                    <Button size="icon-sm" variant="ghost" aria-label={`Delete ${m.name}`} onClick={() => removeMilestone.mutate(m.id)}><Trash2 className="size-3.5" /></Button>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>

      {dialog?.kind === "project" && <ProjectDialog project={p} onClose={close} />}
      {dialog?.kind === "task" && <TaskDialog task={dialog.task} projects={[{ id: p.id, name: p.name }]} defaultProjectId={p.id} onClose={close} />}
      {dialog?.kind === "milestone" && <MilestoneDialog projectId={p.id} milestone={dialog.milestone} onClose={close} />}
      <ConfirmDialog open={dialog?.kind === "delete-project"} title="Delete project?" message="All tasks and milestones in this project will be deleted." loading={removeProject.isPending} onConfirm={() => removeProject.mutate(undefined)} onClose={close} />
      <ConfirmDialog open={dialog?.kind === "delete-task"} title="Delete task?" message="This cannot be undone." loading={removeTask.isPending} onConfirm={() => dialog?.kind === "delete-task" && removeTask.mutate(dialog.task.id)} onClose={close} />
    </>
  );
}
