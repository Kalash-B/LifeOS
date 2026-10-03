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
import { humanize } from "@/lib/format";
import type { Milestone, Project, ProjectListItem, Task } from "@/types/api";

export const PROJECT_CATEGORIES = ["PERSONAL", "STARTUP", "COLLEGE", "FREELANCE", "OTHER"] as const;
export const PROJECT_STATUSES = ["PLANNING", "ACTIVE", "BLOCKED", "ON_HOLD", "COMPLETED", "ARCHIVED"] as const;
export const TASK_STATUSES = ["BACKLOG", "TODO", "IN_PROGRESS", "BLOCKED", "COMPLETED"] as const;
export const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;
export const STATUS_TONE = { PLANNING: "neutral", ACTIVE: "accent", BLOCKED: "danger", ON_HOLD: "warning", COMPLETED: "success", ARCHIVED: "neutral" } as const;

const toDay = (iso?: string | null) => (iso ? iso.slice(0, 10) : "");
/** Date-only input → end of that local day, so "due Friday" means due by Friday night. */
const dueIso = (day: string) => new Date(`${day}T23:59:00`).toISOString();

const projectSchema = z
  .object({
    name: z.string().trim().min(1, "Required").max(120),
    description: z.string().max(2000).optional(),
    category: z.enum(PROJECT_CATEGORIES),
    status: z.enum(PROJECT_STATUSES),
    priority: z.union([z.enum(PRIORITIES), z.literal("")]),
    startDate: z.string().optional(),
    deadline: z.string().optional(),
    manualProgress: z.boolean(),
    progress: z.preprocess((v) => (v === "" || v === undefined ? undefined : Number(v)), z.number().int().min(0).max(100).optional()),
  })
  .refine((v) => !v.startDate || !v.deadline || v.deadline >= v.startDate, { path: ["deadline"], message: "Deadline must be on or after the start date" });

export function ProjectDialog({ project, onClose }: { project?: Project | ProjectListItem; onClose: () => void }) {
  const form = useForm({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: project?.name ?? "",
      description: project?.description ?? "",
      category: project?.category ?? "PERSONAL",
      status: project?.status ?? "PLANNING",
      priority: project?.priority ?? "",
      startDate: toDay(project?.startDate),
      deadline: toDay(project?.deadline),
      manualProgress: project ? !project.autoProgress : false,
      progress: project?.progress ?? 0,
    },
  });
  const manual = form.watch("manualProgress");
  const save = useApiMutation(
    ({ manualProgress, progress, ...v }: z.output<typeof projectSchema>) => {
      const body = {
        ...v,
        description: v.description || undefined,
        priority: v.priority || undefined,
        startDate: v.startDate || undefined,
        deadline: v.deadline || undefined,
        autoProgress: !manualProgress,
        ...(manualProgress ? { progress } : {}),
      };
      return project ? api(`/projects/${project.id}`, { method: "PATCH", body }) : api("/projects", { method: "POST", body });
    },
    { invalidate: [["projects"]], success: project ? "Project updated" : "Project created", onSuccess: onClose },
  );
  const errors = form.formState.errors;
  return (
    <Dialog open onClose={onClose} title={project ? "Edit project" : "New project"}>
      <form onSubmit={form.handleSubmit((v) => save.mutate(v))} className="grid gap-4">
        <Field label="Name" error={errors.name?.message}>
          <Input autoFocus {...form.register("name")} />
        </Field>
        <FormRow>
          <Field label="Category">
            <Select {...form.register("category")}>{PROJECT_CATEGORIES.map((c) => <option key={c} value={c}>{humanize(c)}</option>)}</Select>
          </Field>
          <Field label="Status">
            <Select {...form.register("status")}>{PROJECT_STATUSES.map((c) => <option key={c} value={c}>{humanize(c)}</option>)}</Select>
          </Field>
        </FormRow>
        <FormRow>
          <Field label="Start date">
            <Input type="date" {...form.register("startDate")} />
          </Field>
          <Field label="Deadline" error={errors.deadline?.message}>
            <Input type="date" {...form.register("deadline")} />
          </Field>
        </FormRow>
        <Field label="Priority">
          <Select {...form.register("priority")}>
            <option value="">None</option>
            {PRIORITIES.map((p) => <option key={p} value={p}>{humanize(p)}</option>)}
          </Select>
        </Field>
        <label className="flex items-center gap-2 text-sm text-text-2">
          <input type="checkbox" className="size-4 accent-[var(--accent)]" {...form.register("manualProgress")} />
          Set progress manually (otherwise it follows completed tasks)
        </label>
        {manual && (
          <Field label="Progress (%)" error={errors.progress?.message}>
            <Input type="number" min={0} max={100} {...form.register("progress")} />
          </Field>
        )}
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

const taskSchema = z.object({
  projectId: z.string().min(1, "Choose a project"),
  title: z.string().trim().min(1, "Required").max(200),
  description: z.string().max(2000).optional(),
  status: z.enum(TASK_STATUSES),
  priority: z.union([z.enum(PRIORITIES), z.literal("")]),
  dueDate: z.string().optional(),
});

export function TaskDialog({ task, projects, defaultProjectId, onClose }: { task?: Task; projects: { id: string; name: string }[]; defaultProjectId?: string; onClose: () => void }) {
  const form = useForm({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      projectId: task?.projectId ?? defaultProjectId ?? projects[0]?.id ?? "",
      title: task?.title ?? "",
      description: task?.description ?? "",
      status: task?.status ?? "TODO",
      priority: task?.priority ?? "",
      dueDate: task?.dueDate ? new Date(task.dueDate).toLocaleDateString("en-CA") : "",
    },
  });
  const save = useApiMutation(
    ({ projectId, ...v }: z.output<typeof taskSchema>) => {
      const body = { ...v, description: v.description || null, priority: v.priority || null, dueDate: v.dueDate ? dueIso(v.dueDate) : null };
      return task ? api(`/tasks/${task.id}`, { method: "PATCH", body }) : api(`/projects/${projectId}/tasks`, { method: "POST", body: { ...body, description: body.description ?? undefined, priority: body.priority ?? undefined, dueDate: body.dueDate ?? undefined } });
    },
    { invalidate: [["projects"], ["tasks"]], success: task ? "Task updated" : "Task added", onSuccess: onClose },
  );
  const errors = form.formState.errors;
  return (
    <Dialog open onClose={onClose} title={task ? "Edit task" : "New task"}>
      <form onSubmit={form.handleSubmit((v) => save.mutate(v))} className="grid gap-4">
        <Field label="Task" error={errors.title?.message}>
          <Input autoFocus {...form.register("title")} />
        </Field>
        {!task && (
          <Field label="Project" error={errors.projectId?.message}>
            <Select {...form.register("projectId")}>
              <option value="">Choose…</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
          </Field>
        )}
        <FormRow>
          <Field label="Status">
            <Select {...form.register("status")}>{TASK_STATUSES.map((s) => <option key={s} value={s}>{humanize(s)}</option>)}</Select>
          </Field>
          <Field label="Priority">
            <Select {...form.register("priority")}>
              <option value="">None</option>
              {PRIORITIES.map((p) => <option key={p} value={p}>{humanize(p)}</option>)}
            </Select>
          </Field>
        </FormRow>
        <Field label="Due date">
          <Input type="date" {...form.register("dueDate")} />
        </Field>
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

const milestoneSchema = z.object({
  name: z.string().trim().min(1, "Required").max(120),
  targetDate: z.string().optional(),
  status: z.enum(["PLANNED", "IN_PROGRESS", "COMPLETED", "MISSED"]),
});

export function MilestoneDialog({ projectId, milestone, onClose }: { projectId: string; milestone?: Milestone; onClose: () => void }) {
  const form = useForm({ resolver: zodResolver(milestoneSchema), defaultValues: { name: milestone?.name ?? "", targetDate: toDay(milestone?.targetDate), status: milestone?.status ?? "PLANNED" } });
  const save = useApiMutation(
    (v: z.output<typeof milestoneSchema>) => {
      const body = { ...v, targetDate: v.targetDate || undefined };
      return milestone ? api(`/milestones/${milestone.id}`, { method: "PATCH", body }) : api(`/projects/${projectId}/milestones`, { method: "POST", body });
    },
    { invalidate: [["projects"]], success: "Milestone saved", onSuccess: onClose },
  );
  return (
    <Dialog open onClose={onClose} title={milestone ? "Edit milestone" : "New milestone"}>
      <form onSubmit={form.handleSubmit((v) => save.mutate(v))} className="grid gap-4">
        <Field label="Milestone" error={form.formState.errors.name?.message}>
          <Input autoFocus placeholder="MVP launched" {...form.register("name")} />
        </Field>
        <FormRow>
          <Field label="Target date">
            <Input type="date" {...form.register("targetDate")} />
          </Field>
          <Field label="Status">
            <Select {...form.register("status")}>{["PLANNED", "IN_PROGRESS", "COMPLETED", "MISSED"].map((s) => <option key={s} value={s}>{humanize(s)}</option>)}</Select>
          </Field>
        </FormRow>
        <DialogActions>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={save.isPending}>Save</Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
