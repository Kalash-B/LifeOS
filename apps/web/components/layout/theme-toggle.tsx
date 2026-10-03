"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

type Theme = "system" | "light" | "dark";
const ORDER: Theme[] = ["system", "light", "dark"];
const ICONS = { system: Monitor, light: Sun, dark: Moon };

export function applyTheme(theme: Theme) {
  try {
    if (theme === "system") {
      delete document.documentElement.dataset.theme;
      localStorage.removeItem("lifeos-theme");
    } else {
      document.documentElement.dataset.theme = theme;
      localStorage.setItem("lifeos-theme", theme);
    }
  } catch {
    /* storage unavailable — theme still applies for this page view */
  }
}

export function readTheme(): Theme {
  try {
    const saved = localStorage.getItem("lifeos-theme");
    return saved === "light" || saved === "dark" ? saved : "system";
  } catch {
    return "system";
  }
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("system");
  // eslint-disable-next-line react-hooks/set-state-in-effect -- sync from localStorage after hydration
  useEffect(() => setTheme(readTheme()), []);
  const Icon = ICONS[theme];
  const next = ORDER[(ORDER.indexOf(theme) + 1) % ORDER.length];
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={`Theme: ${theme}. Switch to ${next}`}
      title={`Theme: ${theme}`}
      onClick={() => {
        applyTheme(next);
        setTheme(next);
      }}
    >
      <Icon className="size-4" />
    </Button>
  );
}
