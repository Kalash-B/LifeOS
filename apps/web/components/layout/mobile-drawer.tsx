"use client";

import { X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { Logo } from "./logo";
import { NAV_GROUPS } from "./nav";

export function MobileDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (open) ref.current?.showModal();
    else ref.current?.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      aria-label="Navigation"
      className="m-0 h-dvh max-h-dvh w-72 max-w-[85vw] border-r border-border bg-surface p-0 text-text"
    >
      <div className="flex h-16 items-center justify-between px-4">
        <Logo />
        <button type="button" onClick={onClose} aria-label="Close navigation" className="grid size-9 place-items-center rounded-lg text-text-3 hover:bg-surface-2">
          <X className="size-5" />
        </button>
      </div>
      <nav className="px-3 pb-8">
        {NAV_GROUPS.map((group, i) => (
          <div key={i} className="mt-3">
            {group.label && <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-text-3">{group.label}</p>}
            {group.items.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={onClose}
                aria-current={pathname.startsWith(href) ? "page" : undefined}
                className={cn("flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium", pathname.startsWith(href) ? "bg-accent-soft text-accent" : "text-text-2 hover:bg-surface-2")}
              >
                <Icon className="size-4" aria-hidden /> {label}
              </Link>
            ))}
          </div>
        ))}
      </nav>
    </dialog>
  );
}
