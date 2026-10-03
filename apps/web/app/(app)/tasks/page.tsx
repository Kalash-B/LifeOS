"use client";

import { ListChecks, Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { TaskChecklist } from "@/components/dashboard/today-lists";
import { TaskDialog } from "@/components/projects/forms";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Segmented } from "@/components/ui/segmented";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { useAddParam } from "@/hooks/use-add-param";
import { useApi } from "@/hooks/use-api";
import type { ProjectListItem, Task } from "@/types/api";

type View = "today" | "week" | "overdue" | "open" | "all";
const VIEWS: { value: View; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "week", label: "Next 7 days" },
  { value: "overdue", label: "Overdue" },
  { value: "open", label: "All open" },
  { value: "all", label: "Everything" },
];

export default function TasksPage() {
  const [view, setView] = useState<View>("today");
  const tasks = useApi<Task[]>(["tasks", view], view === "all" ? "/tasks" : `/tasks?view=${view}`);
  const projects = useApi<ProjectListItem[]>(["projects", "list"], "/projects");
  const [add, clearAdd] = useAddParam();
  const [creating, setCreating] = useState(false);
  const open = creating || add === "task";
  const openProjects = projects.data?.filter((p) => !["COMPLETED", "ARCHIVED"].includes(p.status)) ?? [];

  return (
    <>
      <PageHeader
        title="Tasks"
        description="Every task across your projects, by when it's due."
        actions={<Button disabled={!openProjects.length} onClick={() => setCreating(true)}><Plus className="size-4" /> New task</Button>}
      />
      <Segmented className="mb-5" label="Task view" value={view} onChange={setView} options={VIEWS} />
      <Card>
        <CardContent className="py-2">
          {tasks.isError ? (
            <ErrorState error={tasks.error} onRetry={() => tasks.refetch()} />
          ) : !tasks.data ? (
            <LoadingState className="p-0" />
          ) : projects.data && !projects.data.length ? (
            <EmptyState icon={ListChecks} title="Tasks live inside projects" description="Create a project first — even a simple “Personal” one." action={<Link href="/projects" className="text-sm font-medium text-accent hover:underline">Go to projects</Link>} />
          ) : (
            <TaskChecklist tasks={tasks.data} emptyText={view === "overdue" ? "Nothing overdue" : "No tasks here"} />
          )}
        </CardContent>
      </Card>
      {open && openProjects.length > 0 && <TaskDialog projects={openProjects} onClose={() => { setCreating(false); clearAdd(); }} />}
    </>
  );
}
