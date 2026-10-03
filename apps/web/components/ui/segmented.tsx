"use client";

import { cn } from "@/lib/utils";

interface SegmentedProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
  label: string;
  className?: string;
}

/** Accessible tab-like segmented control (radiogroup semantics). */
export function Segmented<T extends string>({ value, onChange, options, label, className }: SegmentedProps<T>) {
  return (
    <div role="radiogroup" aria-label={label} className={cn("inline-flex max-w-full overflow-x-auto rounded-lg border border-border bg-surface-2 p-0.5", className)}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            "whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium text-text-2 transition-colors",
            value === option.value ? "bg-surface text-text shadow-card" : "hover:text-text",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
