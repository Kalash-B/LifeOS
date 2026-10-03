"use client";

import { useEffect, useState } from "react";
import { create } from "zustand";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface PwaState {
  installEvent: BeforeInstallPromptEvent | null;
  installed: boolean;
}

export const usePwa = create<PwaState>(() => ({ installEvent: null, installed: false }));

/** True when running as the installed app (full screen / standalone window). */
export function isInstalledDisplay() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: fullscreen)").matches ||
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/** Call once at startup: registers the service worker and captures the install prompt. */
export function initPwa() {
  if (typeof window === "undefined") return;
  usePwa.setState({ installed: isInstalledDisplay() });
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault(); // show our own Install button instead of the mini-infobar
    usePwa.setState({ installEvent: event as BeforeInstallPromptEvent });
  });
  window.addEventListener("appinstalled", () => usePwa.setState({ installEvent: null, installed: true }));
  // Dev servers rebuild constantly; a service worker would serve stale bundles there.
  if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => undefined);
  }
}

export async function promptInstall() {
  const event = usePwa.getState().installEvent;
  if (!event) return false;
  await event.prompt();
  const { outcome } = await event.userChoice;
  usePwa.setState({ installEvent: null });
  return outcome === "accepted";
}

/** Browser full-screen (Fullscreen API) for when LifeOS runs in a normal tab. */
export function useFullscreen() {
  const [active, setActive] = useState(false);
  const [supported, setSupported] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- feature detection after mount
    setSupported(Boolean(document.fullscreenEnabled) && !isInstalledDisplay());
    const sync = () => setActive(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);
  const toggle = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen({ navigationUI: "hide" }).catch(() => undefined);
  };
  return { active, supported, toggle };
}
