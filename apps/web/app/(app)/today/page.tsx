"use client";

import Link from "next/link";
import { HabitChecklist, RoutineChecklist, TaskChecklist } from "@/components/dashboard/today-lists";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Progress } from "@/components/ui/progress";
import { ErrorState, LoadingState } from "@/components/ui/states";
import { useApi } from "@/hooks/use-api";
import { formatDateKey, formatMinutes } from "@/lib/format";
import type { DashboardToday } from "@/types/api";

export default function TodayPage() {
  const { data, isError, error, refetch } = useApi<DashboardToday>(["dashboard", "today"], "/dashboard/today");
  if (isError) return <ErrorState error={error} onRetry={() => refetch()} />;
  if (!data) return <LoadingState rows={6} />;
  return (
    <>
      <PageHeader title="Today" description={formatDateKey(data.date, { weekday: "long", month: "long", day: "numeric" })} />
      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="lg:row-span-2">
          <CardHeader title="Schedule" description={`${data.routine.completed} of ${data.routine.total} routine items done`} action={<Link href="/routine" className="text-sm text-accent hover:underline">Edit</Link>} />
          <CardContent className="pt-2">
            <Progress value={data.routine.completionRate} label="Routine completion" className="mb-2" />
            <RoutineChecklist day={data.routine} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader title="Habits" description={`${data.habits.completed} of ${data.habits.due} done`} />
          <CardContent className="pt-2">
            <HabitChecklist habits={data.habits.items} date={data.date} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader title="Due today & overdue" description={`${data.tasks.total} open`} action={<Link href="/tasks" className="text-sm text-accent hover:underline">All tasks</Link>} />
          <CardContent className="pt-2">
            <TaskChecklist tasks={data.tasks.items} emptyText="Nothing due — nice." />
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader title="Learning" description={`${formatMinutes(data.learning.minutes)} of ${formatMinutes(data.learning.goalMinutes)} today`} action={<Link href="/learning?add=timer" className="text-sm text-accent hover:underline">Start a session</Link>} />
          <CardContent>
            <Progress value={data.learning.goalMinutes ? (data.learning.minutes / data.learning.goalMinutes) * 100 : 0} label="Study goal" />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
