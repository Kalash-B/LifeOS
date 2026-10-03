"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface CheckButtonProps {
  checked: boolean;
  onToggle: () => void;
  label: string;
  disabled?: boolean;
  className?: string;
}

/** Large tap target that toggles completion. State is conveyed by icon + aria, not color alone. */
export function CheckButton({ checked, onToggle, label, disabled, className }: CheckButtonProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onToggle}
      className={cn(
        "grid size-6 shrink-0 place-items-center rounded-md border-2 transition-colors disabled:opacity-50",
        checked ? "border-accent bg-accent text-accent-fg" : "border-border-strong bg-surface hover:border-accent",
        className,
      )}
    >
      {checked && <Check className="size-3.5" strokeWidth={3} aria-hidden />}
    </button>
  );
}
