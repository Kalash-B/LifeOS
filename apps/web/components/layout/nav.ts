import {
  BarChart3,
  Bell,
  CalendarCheck,
  Dumbbell,
  FolderKanban,
  GraduationCap,
  LayoutDashboard,
  ListChecks,
  Repeat,
  Settings,
  Sun,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

/** Sidebar structure from spec §22: grouped by intent, not by database entity. */
export const NAV_GROUPS: { label?: string; items: NavItem[] }[] = [
  { items: [{ href: "/dashboard", label: "Dashboard", icon: LayoutDashboard }] },
  {
    label: "Plan",
    items: [
      { href: "/today", label: "Today", icon: Sun },
      { href: "/routine", label: "Routine", icon: CalendarCheck },
      { href: "/tasks", label: "Tasks", icon: ListChecks },
    ],
  },
  {
    label: "Track",
    items: [
      { href: "/habits", label: "Habits", icon: Repeat },
      { href: "/fitness", label: "Fitness", icon: Dumbbell },
    ],
  },
  { label: "Grow", items: [{ href: "/learning", label: "Learning", icon: GraduationCap }] },
  { label: "Build", items: [{ href: "/projects", label: "Projects", icon: FolderKanban }] },
  { label: "Money", items: [{ href: "/finance", label: "Finance", icon: Wallet }] },
  { label: "Insights", items: [{ href: "/analytics", label: "Analytics", icon: BarChart3 }] },
  {
    items: [
      { href: "/notifications", label: "Notifications", icon: Bell },
      { href: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

export const ALL_NAV = NAV_GROUPS.flatMap((group) => group.items);
