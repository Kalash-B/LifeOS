"use client";

import { useQuery } from "@tanstack/react-query";
import { Bell, Download, LogOut, Maximize, Menu, Minimize, Settings } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { api, logout } from "@/lib/api";
import { useAuth } from "@/lib/auth-store";
import { promptInstall, useFullscreen, usePwa } from "@/lib/pwa";
import { Logo } from "./logo";
import { ThemeToggle } from "./theme-toggle";

function useClickOutside(onOutside: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (event: MouseEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent ? event.key === "Escape" : !ref.current?.contains(event.target as Node)) onOutside();
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("keydown", handler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("keydown", handler);
    };
  }, [onOutside]);
  return ref;
}

function UserMenu() {
  const user = useAuth((s) => s.user);
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useClickOutside(() => setOpen(false));
  const name = user?.profile?.displayName || user?.email || "";
  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-label={`Account menu for ${name}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-lg p-1 pr-2 hover:bg-surface-2"
      >
        <span className="grid size-8 place-items-center rounded-full bg-accent-soft text-sm font-semibold text-accent" aria-hidden>
          {name.charAt(0).toUpperCase()}
        </span>
        <span className="hidden max-w-32 truncate text-sm font-medium sm:block">{name}</span>
      </button>
      {open && (
        <div role="menu" className="absolute right-0 z-40 mt-2 w-56 rounded-xl border border-border bg-surface p-1.5 shadow-lg">
          <p className="truncate px-3 py-2 text-xs text-text-3">{user?.email}</p>
          <Link role="menuitem" href="/settings" onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-surface-2">
            <Settings className="size-4" aria-hidden /> Settings
          </Link>
          <button
            role="menuitem"
            type="button"
            onClick={async () => {
              await logout();
              router.replace("/login");
            }}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-danger hover:bg-surface-2"
          >
            <LogOut className="size-4" aria-hidden /> Log out
          </button>
        </div>
      )}
    </div>
  );
}

function NotificationBell() {
  const { data } = useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: () => api<{ count: number }>("/notifications/unread-count"),
    refetchInterval: 60_000,
  });
  const count = data?.count ?? 0;
  return (
    <Link
      href="/notifications"
      className="relative grid size-9 place-items-center rounded-lg text-text-2 hover:bg-surface-2 hover:text-text"
      aria-label={count ? `Notifications, ${count} unread` : "Notifications"}
    >
      <Bell className="size-4" aria-hidden />
      {count > 0 && (
        <span className="tabular absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-accent px-1 text-[10px] font-semibold text-accent-fg">
          {count > 9 ? "9+" : count}
        </span>
      )}
    </Link>
  );
}

function FullscreenButton() {
  const { active, supported, toggle } = useFullscreen();
  if (!supported) return null;
  return (
    <Button variant="ghost" size="icon" onClick={toggle} aria-label={active ? "Exit full screen" : "Full screen"} title={active ? "Exit full screen" : "Full screen"}>
      {active ? <Minimize className="size-4" /> : <Maximize className="size-4" />}
    </Button>
  );
}

function InstallButton() {
  const canInstall = usePwa((s) => Boolean(s.installEvent));
  if (!canInstall) return null;
  return (
    <Button variant="soft" size="sm" onClick={() => void promptInstall()} className="hidden sm:inline-flex">
      <Download className="size-4" /> Install app
    </Button>
  );
}

export function Header({ onOpenMenu }: { onOpenMenu: () => void }) {
  return (
    <header className="sticky top-0 z-30 flex h-[calc(4rem+env(safe-area-inset-top))] items-center gap-2 border-b border-border bg-bg/85 px-4 pt-[env(safe-area-inset-top)] backdrop-blur sm:px-6">
      <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open navigation" onClick={onOpenMenu}>
        <Menu className="size-5" />
      </Button>
      <div className="lg:hidden">
        <Logo />
      </div>
      <div className="ml-auto flex items-center gap-1">
        <InstallButton />
        <FullscreenButton />
        <ThemeToggle />
        <NotificationBell />
        <UserMenu />
      </div>
    </header>
  );
}
