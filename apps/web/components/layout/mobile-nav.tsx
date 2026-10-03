"use client";

import { BarChart3, LayoutDashboard, Plus, Repeat, Sun } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

/** Spec §51 mobile navigation: Dashboard · Today · Track · Add · Analytics. */
export function MobileNav({ onAdd }: { onAdd: () => void }) {
  const pathname = usePathname();
  const items = [
    { href: "/dashboard", label: "Home", icon: LayoutDashboard },
    { href: "/today", label: "Today", icon: Sun },
    { href: "/habits", label: "Track", icon: Repeat },
    { href: "/analytics", label: "Insights", icon: BarChart3 },
  ];
  const link = ({ href, label, icon: Icon }: (typeof items)[number]) => {
    const active = pathname.startsWith(href);
    return (
      <Link key={href} href={href} aria-current={active ? "page" : undefined} className={cn("flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium", active ? "text-accent" : "text-text-3")}>
        <Icon className="size-5" aria-hidden />
        {label}
      </Link>
    );
  };
  return (
    <nav aria-label="Quick" className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
      {items.slice(0, 2).map(link)}
      <button type="button" onClick={onAdd} className="flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium text-text-3" aria-label="Quick add">
        <span className="grid size-9 -mt-3 place-items-center rounded-full bg-accent text-accent-fg shadow-lg">
          <Plus className="size-5" aria-hidden />
        </span>
        Add
      </button>
      {items.slice(2).map(link)}
    </nav>
  );
}
