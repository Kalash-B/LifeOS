"use client";

import { CheckCircle2, Info, X, XCircle } from "lucide-react";
import { useToasts } from "@/lib/toast-store";
import { cn } from "@/lib/utils";

const icons = { success: CheckCircle2, error: XCircle, info: Info };

export function Toaster() {
  const { toasts, dismiss } = useToasts();
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex flex-col items-center gap-2 px-4 lg:bottom-6 lg:items-end lg:px-6">
      {toasts.map((t) => {
        const Icon = icons[t.tone];
        return (
          <div
            key={t.id}
            role={t.tone === "error" ? "alert" : "status"}
            className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border border-border bg-surface px-4 py-3 text-sm shadow-lg"
          >
            <Icon className={cn("mt-0.5 size-4 shrink-0", t.tone === "success" && "text-success", t.tone === "error" && "text-danger", t.tone === "info" && "text-accent")} aria-hidden />
            <p className="flex-1 text-text">{t.message}</p>
            <button type="button" onClick={() => dismiss(t.id)} aria-label="Dismiss" className="text-text-3 hover:text-text">
              <X className="size-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
