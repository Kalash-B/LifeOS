"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { ChartFrame } from "@/components/charts/chart-frame";
import { BarSeriesChart, LineSeriesChart } from "@/components/charts/charts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Progress } from "@/components/ui/progress";
import { Segmented } from "@/components/ui/segmented";
import { ErrorState, LoadingState } from "@/components/ui/states";
import { StatCard } from "@/components/ui/stat-card";
import { useApi } from "@/hooks/use-api";
import { useCurrency } from "@/hooks/use-me";
import { dateKey, formatDate, formatDateKey, formatMoney, humanize, weekdayShort } from "@/lib/format";
import type { CompactDay, MonthlyAnalytics, ProjectsAnalytics, WeeklyAnalytics } from "@/types/api";

function shiftMonth(month: string, delta: number) {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1 + delta, 1)).toISOString().slice(0, 7);
}

function WeeklyView() {
  const currency = useCurrency();
  const weekly = useApi<WeeklyAnalytics>(["analytics", "weekly"], "/analytics/weekly");
  const productivity = useApi<{ days: CompactDay[] }>(["analytics", "productivity", 30], "/analytics/productivity?days=30");
  if (weekly.isError) return <ErrorState error={weekly.error} onRetry={() => weekly.refetch()} />;
  if (!weekly.data) return <LoadingState rows={4} />;
  const w = weekly.data;
  const days = productivity.data?.days ?? [];
  return (
    <div className="grid gap-5">
      <Card>
        <CardHeader title="Weekly review" description={`${formatDateKey(w.from)} – ${formatDateKey(w.to)}`} />
        <CardContent>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3 lg:grid-cols-6">
            {[
              ["Habits", `${w.habitCompletionRate}%`],
              ["Learning", `${w.studyHours} h`],
              ["Workouts", w.workoutCount],
              ["Tasks completed", w.tasksCompleted],
              ["Avg project progress", w.projectProgress === null ? "—" : `${w.projectProgress}%`],
              ["Saved", formatMoney(w.financialSummary.savings, currency, true)],
            ].map(([label, value]) => (
              <div key={label as string}>
                <dt className="text-xs text-text-3">{label}</dt>
                <dd className="tabular mt-1 text-xl font-semibold">{value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-5 text-sm text-text-2">
            Planned items completed this week: <strong className="tabular">{w.weeklyCompletionRate}%</strong>
            {w.averageScore !== null && <> · average daily score <strong className="tabular">{w.averageScore}</strong></>}. Use this to decide one thing to change next week.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title="Daily score" description="Last 30 days" />
          <CardContent>
            {!productivity.data ? <LoadingState className="p-0" /> : (
              <ChartFrame summary="LifeOS daily score for the last 30 days" columns={["Date", "Score"]} rows={days.map((d) => [formatDateKey(d.date), d.score ?? "—"])}>
                <LineSeriesChart data={days} xKey="date" xFormat={(k) => formatDateKey(k)} yDomain={[0, 100]} series={[{ key: "score", label: "Score", color: "var(--series-1)" }]} />
              </ChartFrame>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader title="Consistency" description="Routine and habit completion, last 30 days · gaps = nothing scheduled" />
          <CardContent>
            {!productivity.data ? <LoadingState className="p-0" /> : (
              <ChartFrame summary="Routine and habit completion rate per day, last 30 days" columns={["Date", "Routine", "Habits"]} rows={days.map((d) => [formatDateKey(d.date), d.routineRate === null ? "—" : `${d.routineRate}%`, d.habitRate === null ? "—" : `${d.habitRate}%`])}>
                <LineSeriesChart
                  data={days}
                  xKey="date"
                  xFormat={(k) => formatDateKey(k)}
                  format={(v) => `${v}%`}
                  yDomain={[0, 100]}
                  series={[{ key: "routineRate", label: "Routine", color: "var(--series-1)" }, { key: "habitRate", label: "Habits", color: "var(--series-2)" }]}
                />
              </ChartFrame>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader title="This week, day by day" />
        <CardContent className="overflow-x-auto">
          <table className="tabular w-full min-w-[36rem] text-sm">
            <thead className="text-left text-text-3">
              <tr>{["Day", "Score", "Routine", "Habits", "Study", "Workouts", "Tasks done", "Spent"].map((h) => <th key={h} className="pb-2 font-medium">{h}</th>)}</tr>
            </thead>
            <tbody>
              {w.days.map((d) => (
                <tr key={d.date} className="border-t border-border">
                  <td className="py-2 font-medium">{weekdayShort(d.date)} {formatDateKey(d.date)}</td>
                  <td>{d.score ?? "—"}</td>
                  <td>{d.routineRate === null ? "—" : `${d.routineRate}%`}</td>
                  <td>{d.habitRate === null ? "—" : `${d.habitRate}%`}</td>
                  <td>{d.studyMinutes} min</td>
                  <td>{d.workouts}</td>
                  <td>{d.tasksCompleted}</td>
                  <td>{formatMoney(d.expenses, currency, true)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

function MonthlyView() {
  const currency = useCurrency();
  const current = dateKey().slice(0, 7);
  const [month, setMonth] = useState(current);
  const monthly = useApi<MonthlyAnalytics>(["analytics", "monthly", month], `/analytics/monthly?month=${month}`);
  const m = monthly.data;
  return (
    <div className="grid gap-5">
      <div className="flex items-center gap-1">
        <Button size="icon-sm" variant="ghost" aria-label="Previous month" onClick={() => setMonth(shiftMonth(month, -1))}><ChevronLeft className="size-4" /></Button>
        <span className="w-36 text-center text-sm font-medium" aria-live="polite">{formatDateKey(`${month}-01`, { month: "long", year: "numeric" })}</span>
        <Button size="icon-sm" variant="ghost" aria-label="Next month" disabled={month >= current} onClick={() => setMonth(shiftMonth(month, 1))}><ChevronRight className="size-4" /></Button>
      </div>
      {monthly.isError ? <ErrorState error={monthly.error} /> : !m ? <LoadingState rows={4} /> : !m.days.length ? <p className="text-sm text-text-3">No data for this month.</p> : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Productivity" value={`${m.monthlyProductivity}%`} sub="planned items completed" />
            <StatCard label="Habit consistency" value={`${m.habitCompletionRate}%`} />
            <StatCard label="Learning" value={`${m.learningHours} h`} />
            <StatCard label="Workouts" value={m.workoutCount} sub={m.fitnessTrend !== null ? `weight ${m.fitnessTrend > 0 ? "+" : ""}${m.fitnessTrend}` : undefined} />
            <StatCard label="Tasks completed" value={m.tasksCompleted} sub={`${m.projectsCompleted} project${m.projectsCompleted === 1 ? "" : "s"} finished`} />
            <StatCard label="Income" value={formatMoney(m.income, currency, true)} />
            <StatCard label="Expenses" value={formatMoney(m.expenses, currency, true)} />
            <StatCard label="Savings" value={formatMoney(m.savings, currency, true)} />
          </div>
          <Card>
            <CardHeader title="Study minutes" description="Per day this month" />
            <CardContent>
              <ChartFrame summary="Study minutes per day this month" columns={["Date", "Minutes"]} rows={m.days.map((d) => [formatDateKey(d.date), d.studyMinutes])}>
                <BarSeriesChart data={m.days} xKey="date" xFormat={(k) => formatDateKey(k, { day: "numeric" })} format={(v) => `${v}m`} series={[{ key: "studyMinutes", label: "Minutes", color: "var(--series-1)" }]} />
              </ChartFrame>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function ProjectsView() {
  const data = useApi<ProjectsAnalytics>(["analytics", "projects"], "/analytics/projects");
  if (data.isError) return <ErrorState error={data.error} />;
  if (!data.data) return <LoadingState rows={4} />;
  const p = data.data;
  return (
    <div className="grid gap-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Projects" value={p.total} />
        <StatCard label="Average progress" value={`${p.averageProgress}%`} />
        <StatCard label="Active" value={p.byStatus.ACTIVE ?? 0} />
        <StatCard label="Past deadline" value={p.overdue} sub={p.overdue ? "need attention" : "all on track"} />
      </div>
      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader title="Velocity" description="Tasks completed per week" />
          <CardContent>
            <ChartFrame summary="Tasks completed per week, last 8 weeks" columns={["Week of", "Tasks"]} rows={p.velocity.map((v) => [formatDateKey(v.week), v.completed])}>
              <BarSeriesChart data={p.velocity} xKey="week" xFormat={(k) => formatDateKey(k)} series={[{ key: "completed", label: "Tasks completed", color: "var(--series-1)" }]} />
            </ChartFrame>
          </CardContent>
        </Card>
        <Card>
          <CardHeader title="Upcoming deadlines" />
          <CardContent className="pt-2">
            {!p.upcomingDeadlines.length ? <p className="text-sm text-text-3">No upcoming deadlines.</p> : (
              <ul className="grid gap-4">
                {p.upcomingDeadlines.map((d) => (
                  <li key={d.id}>
                    <div className="flex justify-between gap-2 text-sm">
                      <Link href={`/projects/${d.id}`} className="truncate font-medium hover:text-accent">{d.name}</Link>
                      <span className="shrink-0 text-text-3">{formatDate(d.deadline, { month: "short", day: "numeric" })}</span>
                    </div>
                    <Progress className="mt-1.5" value={d.progress} label={`${d.name} progress`} />
                    <p className="mt-1 text-xs text-text-3">{d.progress}% · {humanize(d.status)}</p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const [tab, setTab] = useState<"weekly" | "monthly" | "projects">("weekly");
  return (
    <>
      <PageHeader
        title="Analytics"
        description={<>Computed from your own records. Fitness, learning and finance have deeper views on their pages: <Link className="text-accent hover:underline" href="/fitness">fitness</Link>, <Link className="text-accent hover:underline" href="/learning">learning</Link>, <Link className="text-accent hover:underline" href="/finance">finance</Link>.</>}
      />
      <Segmented className="mb-5" label="Analytics view" value={tab} onChange={setTab} options={[{ value: "weekly", label: "Weekly" }, { value: "monthly", label: "Monthly" }, { value: "projects", label: "Projects" }]} />
      {tab === "weekly" && <WeeklyView />}
      {tab === "monthly" && <MonthlyView />}
      {tab === "projects" && <ProjectsView />}
    </>
  );
}
