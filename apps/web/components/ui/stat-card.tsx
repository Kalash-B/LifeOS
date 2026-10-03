import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  icon?: LucideIcon;
  className?: string;
  children?: ReactNode;
}

export function StatCard({ label, value, sub, icon: Icon, className, children }: StatCardProps) {
  return (
    <div className={cn("min-w-0 rounded-xl border border-border bg-surface p-4 shadow-card", className)}>
      <div className="flex items-center justify-between gap-2 text-sm text-text-3">
        <span className="truncate">{label}</span>
        {Icon && <Icon className="size-4 shrink-0" aria-hidden />}
      </div>
      <div className="tabular mt-2 text-2xl font-semibold tracking-tight text-text">{value}</div>
      {sub && <div className="mt-1 text-xs text-text-3">{sub}</div>}
      {children}
    </div>
  );
}
