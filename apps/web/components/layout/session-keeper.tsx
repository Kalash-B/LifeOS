"use client";

import { useEffect } from "react";
import { refreshSession } from "@/lib/api";
import { useAuth } from "@/lib/auth-store";

/** Refresh this long before the access token expires. */
const LEAD_MS = 60_000;

/**
 * Keeps an open app signed in: renews the access token shortly before it
 * expires, and immediately when the app comes back from the background (a
 * sleeping phone or a minimized window skips timers). Each renewal also slides
 * the refresh session forward, so active use never times out.
 */
export function SessionKeeper() {
  const expiresAt = useAuth((s) => s.expiresAt);

  useEffect(() => {
    if (!expiresAt) return;
    const renew = async () => {
      if ((await refreshSession()) === "unauthenticated") {
        useAuth.getState().clear();
        window.location.replace(`/login?next=${encodeURIComponent(window.location.pathname)}`);
      }
    };
    const timer = setTimeout(renew, Math.max(0, expiresAt - Date.now() - LEAD_MS));
    const onResume = () => {
      if (document.visibilityState === "visible" && Date.now() > expiresAt - LEAD_MS) void renew();
    };
    document.addEventListener("visibilitychange", onResume);
    window.addEventListener("online", onResume);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onResume);
      window.removeEventListener("online", onResume);
    };
  }, [expiresAt]);

  return null;
}
