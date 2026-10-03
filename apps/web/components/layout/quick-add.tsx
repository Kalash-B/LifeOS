"use client";

import { CheckSquare, Dumbbell, GraduationCap, ListPlus, Receipt, Scale } from "lucide-react";
import Link from "next/link";
import { Dialog } from "@/components/ui/dialog";

/** Spec §51: the most important mobile experience is quick logging. */
const ACTIONS = [
  { href: "/habits", label: "Complete a habit", icon: CheckSquare },
  { href: "/finance?add=expense", label: "Add expense", icon: Receipt },
  { href: "/fitness?add=weight", label: "Log weight", icon: Scale },
  { href: "/learning?add=timer", label: "Start study session", icon: GraduationCap },
  { href: "/tasks?add=task", label: "Add task", icon: ListPlus },
  { href: "/fitness?add=workout", label: "Log workout", icon: Dumbbell },
];

export function QuickAdd({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onClose={onClose} title="Quick add">
      <div className="grid grid-cols-2 gap-2">
        {ACTIONS.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} onClick={onClose} className="flex flex-col items-start gap-3 rounded-xl border border-border p-4 text-sm font-medium hover:border-accent hover:bg-accent-soft/40">
            <Icon className="size-5 text-accent" aria-hidden />
            {label}
          </Link>
        ))}
      </div>
    </Dialog>
  );
}
