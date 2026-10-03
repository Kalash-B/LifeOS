"use client";

import { Info } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ProgressRing } from "@/components/ui/progress";
import type { ScoreResult } from "@/types/api";

const LABELS = { routine: "Routine", habits: "Habits", fitness: "Fitness", learning: "Learning", projects: "Projects", finance: "Finance" };

/** Spec §20: transparent score — every component, weight and explanation is visible. */
export function ScoreCard({ score }: { score: ScoreResult | null }) {
  if (!score) {
    return (
      <Card>
        <CardHeader title="LifeOS score" />
        <CardContent className="text-sm text-text-3">
          The score is turned off. <Link href="/settings" className="text-accent hover:underline">Turn it on in settings</Link>.
        </CardContent>
      </Card>
    );
  }
  return (
    <Card>
      <CardHeader
        title="Today's progress"
        description="A visualization of today's activity — not a judgement."
        action={
          <Link href="/settings#score" className="inline-flex items-center gap-1 text-xs text-text-3 hover:text-accent">
            <Info className="size-3.5" aria-hidden /> Weights
          </Link>
        }
      />
      <CardContent className="grid items-center gap-6 sm:grid-cols-[auto_1fr]">
        <div className="justify-self-center">
          <ProgressRing value={score.score} label="LifeOS score" size={132}>
            <div>
              <div className="tabular text-3xl font-semibold">{score.score ?? "—"}</div>
              <div className="text-xs text-text-3">of 100</div>
            </div>
          </ProgressRing>
        </div>
        <ul className="grid gap-2.5">
          {score.breakdown.map((item) => (
            <li key={item.component} className="grid grid-cols-[5.5rem_1fr_auto] items-center gap-3 text-sm" title={item.explanation}>
              <span className="text-text-2">{LABELS[item.component]}</span>
              <div className="min-w-0">
                <div className="h-1.5 overflow-hidden rounded-full bg-surface-3">
                  {item.score !== null && <div className="h-full rounded-full bg-accent" style={{ width: `${item.score}%` }} />}
                </div>
                <p className="mt-0.5 truncate text-xs text-text-3">{item.explanation}</p>
              </div>
              <span className="tabular w-16 text-right text-xs text-text-3">
                {item.score === null ? "n/a" : `${item.score}% · ${Math.round(item.effectiveWeight)}w`}
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
