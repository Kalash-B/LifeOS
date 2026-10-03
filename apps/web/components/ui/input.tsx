import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const base =
  "w-full rounded-lg border border-border bg-surface px-3 text-sm text-text placeholder:text-text-3 transition-colors hover:border-border-strong focus-visible:border-accent focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[var(--ring)] disabled:opacity-60 aria-invalid:border-danger";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(base, "h-10", className)} {...props} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(base, "min-h-20 py-2", className)} {...props} />;
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(base, "h-10 pr-8", className)} {...props}>
      {children}
    </select>
  );
}
