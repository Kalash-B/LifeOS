"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Logo } from "./logo";
import { NAV_GROUPS } from "./nav";

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-border bg-surface lg:flex">
      <div className="flex h-16 items-center px-5">
        <Logo />
      </div>
      <nav aria-label="Main" className="flex-1 overflow-y-auto px-3 pb-6">
        {NAV_GROUPS.map((group, index) => (
          <div key={index} className="mt-4 first:mt-1">
            {group.label && <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-text-3">{group.label}</p>}
            <ul className="grid gap-0.5">
              {group.items.map(({ href, label, icon: Icon }) => {
                const active = pathname === href || pathname.startsWith(`${href}/`);
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                        active ? "bg-accent-soft text-accent" : "text-text-2 hover:bg-surface-2 hover:text-text",
                      )}
                    >
                      <Icon className="size-4" aria-hidden />
                      {label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}
