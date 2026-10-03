"use client";

import { CalendarCheck, ListChecks, Repeat } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { CheckButton } from "@/components/ui/check-button";
import { EmptyState } from "@/components/ui/states";
import { useSetTaskStatus, useToggleHabit, useToggleRoutineItem } from "@/hooks/use-actions";
import { formatDate, humanize, isOverdue } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Habit, RoutineDay, Task } from "@/types/api";

export function RoutineChecklist({ day, limit }: { day: RoutineDay; limit?: number }) {
  const toggle = useToggleRoutineItem();
  if (!day.items.length) {
    return <EmptyState icon={CalendarCheck} title="Nothing scheduled today" description="Build a routine to plan your day in time blocks." action={<Link href="/routine" className="text-sm font-medium text-accent hover:underline">Set up a routine</Link>} />;
  }
  const items = limit ? day.items.slice(0, limit) : day.items;
  return (
    <ul className="divide-y divide-border">
      {items.map((item) => {
        const done = item.status === "COMPLETED";
        return (
          <li key={item.id} className="flex items-center gap-3 py-2.5">
            <CheckButton
              checked={done}
              label={`${item.title}${done ? " (completed)" : ""}`}
              disabled={toggle.isPending}
              onToggle={() => toggle.mutate({ itemId: item.id, date: day.date, completed: !done })}
            />
            <div className="min-w-0 flex-1">
              <p className={cn("truncate text-sm font-medium", done && "text-text-3 line-through")}>{item.title}</p>
              <p className="truncate text-xs text-text-3">{item.routineName}{item.category ? ` · ${item.category}` : ""}</p>
            </div>
            {item.startTime && (
              <span className="tabular shrink-0 text-xs text-text-3">
                {item.startTime}
                {item.endTime ? `–${item.endTime}` : ""}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function HabitChecklist({ habits, date }: { habits: Habit[]; date: string }) {
  const toggle = useToggleHabit();
  const due = habits.filter((habit) => habit.scheduledToday);
  if (!due.length) {
    return <EmptyState icon={Repeat} title="No habits due today" action={<Link href="/habits" className="text-sm font-medium text-accent hover:underline">Create a habit</Link>} />;
  }
  return (
    <ul className="divide-y divide-border">
      {due.map((habit) => {
        const done = habit.todayStatus === "COMPLETED";
        return (
          <li key={habit.id} className="flex items-center gap-3 py-2.5">
            <CheckButton checked={done} label={`${habit.name}${done ? " (done today)" : ""}`} disabled={toggle.isPending} onToggle={() => toggle.mutate({ habitId: habit.id, date, completed: !done })} />
            <p className={cn("min-w-0 flex-1 truncate text-sm font-medium", done && "text-text-3 line-through")}>{habit.name}</p>
            {habit.streak.current > 0 && (
              <span className="tabular shrink-0 text-xs text-text-3">
                {habit.streak.current} {habit.streak.unit}
                {habit.streak.current === 1 ? "" : "s"} streak
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

const PRIORITY_TONE = { URGENT: "danger", HIGH: "warning", MEDIUM: "neutral", LOW: "neutral" } as const;

export function TaskChecklist({ tasks, showProject = true, emptyText = "No tasks due" }: { tasks: Task[]; showProject?: boolean; emptyText?: string }) {
  const setStatus = useSetTaskStatus();
  if (!tasks.length) return <EmptyState icon={ListChecks} title={emptyText} />;
  return (
    <ul className="divide-y divide-border">
      {tasks.map((task) => {
        const done = task.status === "COMPLETED";
        const overdue = isOverdue(task.dueDate, done);
        return (
          <li key={task.id} className="flex items-center gap-3 py-2.5">
            <CheckButton checked={done} label={`${task.title}${done ? " (completed)" : ""}`} disabled={setStatus.isPending} onToggle={() => setStatus.mutate({ taskId: task.id, status: done ? "TODO" : "COMPLETED" })} />
            <div className="min-w-0 flex-1">
              <p className={cn("truncate text-sm font-medium", done && "text-text-3 line-through")}>{task.title}</p>
              <p className="truncate text-xs text-text-3">
                {showProject && task.project ? (
                  <Link href={`/projects/${task.project.id}`} className="hover:text-accent">
                    {task.project.name}
                  </Link>
                ) : (
                  humanize(task.status)
                )}
                {task.dueDate && <span className={cn(overdue && "font-medium text-danger")}> · {overdue ? "Overdue · " : "Due "}{formatDate(task.dueDate, { month: "short", day: "numeric" })}</span>}
              </p>
            </div>
            {task.priority && <Badge tone={PRIORITY_TONE[task.priority]}>{humanize(task.priority)}</Badge>}
          </li>
        );
      })}
    </ul>
  );
}
