import type { MetadataRoute } from "next";

/**
 * Installable app (spec §46). Installed LifeOS opens full screen without browser
 * UI; browsers that don't support fullscreen fall back to a standalone window.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "LifeOS — Personal Life Operating System",
    short_name: "LifeOS",
    description: "Plan your day, build habits, track fitness, learning, projects and money — in one system.",
    start_url: "/dashboard?source=pwa",
    scope: "/",
    display: "fullscreen",
    display_override: ["fullscreen", "standalone", "minimal-ui"],
    orientation: "any",
    background_color: "#f7f3ec",
    theme_color: "#f7f3ec",
    categories: ["productivity", "lifestyle", "health"],
    icons: [
      { src: "/icons/android-chrome-192x192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/android-chrome-512x512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    shortcuts: [
      { name: "Today", url: "/today", icons: [{ src: "/icons/android-chrome-192x192.png", sizes: "192x192" }] },
      { name: "Add expense", url: "/finance?add=expense", icons: [{ src: "/icons/android-chrome-192x192.png", sizes: "192x192" }] },
      { name: "Start study session", url: "/learning?add=timer", icons: [{ src: "/icons/android-chrome-192x192.png", sizes: "192x192" }] },
    ],
  };
}
