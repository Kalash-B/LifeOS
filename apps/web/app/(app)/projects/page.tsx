"use client";

import { AlertTriangle, FolderKanban, Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { ProjectDialog, STATUS_TONE } from "@/components/projects/forms";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Progress } from "@/components/ui/progress";
import { Segmented } from "@/components/ui/segmented";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { useApi } from "@/hooks/use-api";
import { formatDate, humanize } from "@/lib/format";
import type { ProjectListItem } from "@/types/api";

type Filter = "open" | "done" | "all";

export default function ProjectsPage() {
  const projects = useApi<ProjectListItem[]>(["projects", "list"], "/projects");
  const [filter, setFilter] = useState<Filter>("open");
  const [creating, setCreating] = useState(false);
  const shown = projects.data?.filter((p) => (filter === "all" ? true : filter === "done" ? ["COMPLETED", "ARCHIVED"].includes(p.status) : !["COMPLETED", "ARCHIVED"].includes(p.status))) ?? [];

  return (
    <>
      <PageHeader
        title="Projects"
        description="Personal, startup, college and freelance work — with tasks and milestones."
        actions={
          <>
            <Segmented label="Filter projects" value={filter} onChange={setFilter} options={[{ value: "open", label: "Open" }, { value: "done", label: "Done" }, { value: "all", label: "All" }]} />
            <Button onClick={() => setCreating(true)}><Plus className="size-4" /> New project</Button>
          </>
        }
      />
      {projects.isError ? (
        <ErrorState error={projects.error} onRetry={() => projects.refetch()} />
      ) : !projects.data ? (
        <LoadingState />
      ) : !shown.length ? (
        <Card>
          <EmptyState icon={FolderKanban} title={projects.data.length ? "Nothing here" : "No projects yet"} description="A project groups tasks and milestones toward an outcome." action={<Button onClick={() => setCreating(true)}>Create a project</Button>} />
        </Card>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {shown.map((p) => (
            <li key={p.id}>
              <Link href={`/projects/${p.id}`} className="block h-full rounded-xl focus-visible:outline-offset-4">
                <Card className="flex h-full flex-col p-5 transition-colors hover:border-border-strong">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="font-semibold">{p.name}</h2>
                    <Badge tone={STATUS_TONE[p.status]}>{humanize(p.status)}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-text-3">{humanize(p.category)}{p.priority ? ` · ${humanize(p.priority)} priority` : ""}</p>
                  {p.description && <p className="mt-3 line-clamp-2 text-sm text-text-2">{p.description}</p>}
                  <div className="mt-auto pt-5">
                    <div className="mb-1.5 flex justify-between text-xs text-text-3">
                      <span>{p.completedTaskCount}/{p.taskCount} tasks</span>
                      <span className="tabular font-medium text-text-2">{p.progress}%</span>
                    </div>
                    <Progress value={p.progress} label={`${p.name} progress`} />
                    <div className="mt-3 flex items-center justify-between text-xs text-text-3">
                      <span>{p.deadline ? `Due ${formatDate(p.deadline)}` : "No deadline"}</span>
                      {p.overdueTaskCount > 0 && <span className="flex items-center gap-1 font-medium text-danger"><AlertTriangle className="size-3.5" aria-hidden /> {p.overdueTaskCount} overdue</span>}
                    </div>
                  </div>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {creating && <ProjectDialog onClose={() => setCreating(false)} />}
    </>
  );
}
