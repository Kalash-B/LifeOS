"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { refreshSession } from "@/lib/api";
import { useAuth } from "@/lib/auth-store";
import { SessionKeeper } from "./session-keeper";

type GateState = "loading" | "unavailable" | "redirecting";

/**
 * Restores the session from the httpOnly refresh cookie on first load. The
 * access token lives only in memory, so every hard reload goes through here.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const token = useAuth((s) => s.accessToken);
  const router = useRouter();
  const [state, setState] = useState<GateState>("loading");

  const restore = useCallback(async () => {
    setState("loading");
    const result = await refreshSession();
    if (result === "unavailable") return setState("unavailable");
    if (result === "unauthenticated") {
      setState("redirecting");
      // Clears the stale hint cookie so the proxy stops treating us as signed in.
      await fetch("/api/v1/auth/logout", { method: "POST" }).catch(() => undefined);
      router.replace(`/login?next=${encodeURIComponent(window.location.pathname)}`);
    }
  }, [router]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- session restore is an external sync
    if (!token) void restore();
  }, [token, restore]);

  if (token) {
    return (
      <>
        <SessionKeeper />
        {children}
      </>
    );
  }
  return (
    <div className="grid min-h-dvh place-items-center px-4" role="status" aria-live="polite">
      {state === "unavailable" ? (
        <div className="flex max-w-sm flex-col items-center gap-3 text-center">
          <p className="font-medium">Can&apos;t reach LifeOS right now</p>
          <p className="text-sm text-text-3">You&apos;re still signed in. Check your connection and try again.</p>
          <Button onClick={() => void restore()}>Try again</Button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 text-sm text-text-3">
          <span className="size-8 animate-spin rounded-full border-2 border-border border-t-accent" aria-hidden />
          {state === "redirecting" ? "Redirecting to sign in…" : "Loading your LifeOS…"}
        </div>
      )}
    </div>
  );
}
