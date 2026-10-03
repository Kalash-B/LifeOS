"use client";

import { Dumbbell, FolderKanban, GraduationCap, Repeat } from "lucide-react";
import Link from "next/link";
import { ChartFrame } from "@/components/charts/chart-frame";
import { BarSeriesChart } from "@/components/charts/charts";
import { ScoreCard } from "@/components/dashboard/score-card";
import { RoutineChecklist } from "@/components/dashboard/today-lists";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ErrorState, LoadingState, Skeleton } from "@/components/ui/states";
import { StatCard } from "@/components/ui/stat-card";
import { useApi } from "@/hooks/use-api";
import { formatDate, formatDateKey, formatMinutes, formatMoney, greeting, weekdayShort } from "@/lib/format";
import type { DashboardSummary, DashboardToday } from "@/types/api";

export default function DashboardPage() {
  const today = useApi<DashboardToday>(["dashboard", "today"], "/dashboard/today");
  const summary = useApi<DashboardSummary>(["dashboard", "summary"], "/dashboard/summary");

  if (today.isError) return <ErrorState error={today.error} onRetry={() => today.refetch()} />;
  if (!today.data) {
    return (
      <div className="grid gap-4">
        <Skeleton className="h-16 w-72" />
        <Skeleton className="h-52" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28" />)}</div>
      </div>
    );
  }

  const t = today.data;
  const s = summary.data;
  const days = s?.weekly.days ?? [];

  return (
    <div className="grid gap-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {greeting()}
          {t.displayName ? `, ${t.displayName}` : ""}
        </h1>
        <p className="mt-1 text-sm text-text-3">{formatDateKey(t.date, { weekday: "long", month: "long", day: "numeric" })}</p>
      </div>

      <ScoreCard score={t.score} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <StatCard label="Habits" icon={Repeat} value={<>{t.habits.completed}<span className="text-base font-normal text-text-3">/{t.habits.due}</span></>} sub="done today">
          <Progress className="mt-3" value={t.habits.due ? (t.habits.completed / t.habits.due) * 100 : 0} label="Habits completed today" />
        </StatCard>
        <StatCard label="Fitness" icon={Dumbbell} value={t.workout ? "Workout ✓" : "Rest"} sub={s ? `${s.fitness.workoutsThisWeek} this week${s.fitness.latestWeight ? ` · ${s.fitness.latestWeight} ${s.fitness.unit}` : ""}` : " "} />
        <StatCard label="Learning" icon={GraduationCap} value={formatMinutes(t.learning.minutes)} sub={`goal ${formatMinutes(t.learning.goalMinutes)}`}>
          <Progress className="mt-3" value={t.learning.goalMinutes ? (t.learning.minutes / t.learning.goalMinutes) * 100 : 0} label="Study goal progress" />
        </StatCard>
        <StatCard label="Tasks" icon={FolderKanban} value={t.tasks.total} sub={t.tasks.total === 1 ? "task due today" : "tasks due today"} />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
        <Card>
          <CardHeader title="Today's routine" description={`${t.routine.completed} of ${t.routine.total} done`} action={<Link href="/today" className="text-sm text-accent hover:underline">Open today</Link>} />
          <CardContent className="pt-2">
            <RoutineChecklist day={t.routine} limit={6} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader title="Weekly productivity" description="Daily LifeOS score, last 7 days" />
          <CardContent>
            {s ? (
              <ChartFrame
                summary={`Daily score for the last 7 days. Average ${s.weekly.averageScore ?? "n/a"}.`}
                columns={["Day", "Score"]}
                rows={days.map((d) => [formatDateKey(d.date), d.score ?? "—"])}
                height={200}
              >
                <BarSeriesChart data={days} xKey="date" xFormat={weekdayShort} series={[{ key: "score", label: "Score", color: "var(--series-1)" }]} yDomain={[0, 100]} />
              </ChartFrame>
            ) : (
              <Skeleton className="h-52" />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title="Financial overview" description={s ? `This month · ${formatDateKey(`${s.finance.month}-01`, { month: "long", year: "numeric" })}` : undefined} action={<Link href="/finance" className="text-sm text-accent hover:underline">Finance</Link>} />
          <CardContent>
            {s ? (
              <dl className="grid grid-cols-3 gap-3">
                {[
                  ["Income", s.finance.income],
                  ["Expenses", s.finance.expenses],
                  ["Savings", s.finance.savings],
                ].map(([label, value]) => (
                  <div key={label as string} className="rounded-lg bg-surface-2 p-3">
                    <dt className="text-xs text-text-3">{label}</dt>
                    <dd className="tabular mt-1 truncate text-lg font-semibold">{formatMoney(value as number, s.finance.currency, true)}</dd>
                  </div>
                ))}
                <div className="col-span-3 flex justify-between text-sm text-text-3">
                  <span>Savings rate {s.finance.savingsRate === null ? "—" : `${s.finance.savingsRate}%`}</span>
                  <span>Balance {formatMoney(s.finance.totalBalance, s.finance.currency)}</span>
                </div>
              </dl>
            ) : (
              <LoadingState rows={2} className="p-0" />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader title="Active projects" action={<Link href="/projects" className="text-sm text-accent hover:underline">Projects</Link>} />
          <CardContent>
            {!s ? (
              <LoadingState rows={2} className="p-0" />
            ) : s.projects.length ? (
              <ul className="grid gap-4">
                {s.projects.map((project) => (
                  <li key={project.id}>
                    <div className="flex justify-between gap-3 text-sm">
                      <Link href={`/projects/${project.id}`} className="truncate font-medium hover:text-accent">
                        {project.name}
                      </Link>
                      <span className="tabular shrink-0 text-text-3">{project.progress}%</span>
                    </div>
                    <Progress className="mt-1.5" value={project.progress} label={`${project.name} progress`} />
                    <p className="mt-1 text-xs text-text-3">
                      {project.completedTaskCount}/{project.taskCount} tasks{project.deadline ? ` · due ${formatDate(project.deadline, { month: "short", day: "numeric" })}` : ""}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-text-3">No active projects. <Link href="/projects" className="text-accent hover:underline">Start one</Link>.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
