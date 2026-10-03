import { AlertTriangle, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { errorMessage } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "./button";

export function EmptyState({ icon: Icon, title, description, action, className }: { icon: LucideIcon; title: string; description?: string; action?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-2 px-6 py-10 text-center", className)}>
      <div className="grid size-11 place-items-center rounded-xl bg-surface-2 text-text-3">
        <Icon className="size-5" aria-hidden />
      </div>
      <p className="mt-1 text-sm font-medium text-text">{title}</p>
      {description && <p className="max-w-sm text-sm text-text-3">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-lg bg-surface-3", className)} aria-hidden />;
}

export function LoadingState({ rows = 3, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("grid gap-3 p-5", className)} role="status" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-10" />
      ))}
    </div>
  );
}

export function ErrorState({ error, onRetry, className }: { error: unknown; onRetry?: () => void; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center gap-2 px-6 py-8 text-center", className)} role="alert">
      <AlertTriangle className="size-5 text-danger" aria-hidden />
      <p className="text-sm font-medium">Couldn&apos;t load this</p>
      <p className="text-sm text-text-3">{errorMessage(error)}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry} className="mt-1">
          Try again
        </Button>
      )}
    </div>
  );
}
