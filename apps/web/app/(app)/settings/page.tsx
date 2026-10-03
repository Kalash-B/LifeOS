"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { Download, Maximize, Smartphone } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { applyTheme, readTheme } from "@/components/layout/theme-toggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Dialog, DialogActions } from "@/components/ui/dialog";
import { Field, FormRow } from "@/components/ui/field";
import { Input, Select, Textarea } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Segmented } from "@/components/ui/segmented";
import { ErrorState, LoadingState } from "@/components/ui/states";
import { useApi, useApiMutation } from "@/hooks/use-api";
import { useMe } from "@/hooks/use-me";
import { api, errorMessage, logout } from "@/lib/api";
import { useAuth } from "@/lib/auth-store";
import { humanize } from "@/lib/format";
import { isInstalledDisplay, promptInstall, useFullscreen, usePwa } from "@/lib/pwa";
import { toast } from "@/lib/toast-store";
import type { Me, NotificationPreferences, ScoreComponent, ScoreWeights, User } from "@/types/api";

const COMPONENTS: { key: ScoreComponent; label: string }[] = [
  { key: "routine", label: "Routine" },
  { key: "habits", label: "Habits" },
  { key: "fitness", label: "Fitness" },
  { key: "learning", label: "Learning" },
  { key: "projects", label: "Projects" },
  { key: "finance", label: "Finance" },
];

function useTimeZones() {
  return useMemo(() => {
    try {
      return Intl.supportedValuesOf("timeZone");
    } catch {
      return ["UTC", "Asia/Kolkata", "Europe/London", "America/New_York"];
    }
  }, []);
}

const profileSchema = z.object({ displayName: z.string().trim().min(1, "Required").max(120), bio: z.string().max(2000).optional(), timezone: z.string().min(1) });

function ProfileSection({ me }: { me: Me }) {
  const zones = useTimeZones();
  const setUser = useAuth((s) => s.setUser);
  const form = useForm({ resolver: zodResolver(profileSchema), defaultValues: { displayName: me.profile?.displayName ?? "", bio: me.profile?.bio ?? "", timezone: me.timezone } });
  const save = useApiMutation((v: z.output<typeof profileSchema>) => api<Me>("/users/me", { method: "PATCH", body: { ...v, bio: v.bio || undefined } }), {
    invalidate: [["me"]],
    success: "Profile saved",
    onSuccess: (updated) => setUser({ ...(updated as unknown as User), profile: updated.profile }),
  });
  const browserZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return (
    <Card id="profile">
      <CardHeader title="Profile" description={me.email} />
      <CardContent>
        <form onSubmit={form.handleSubmit((v) => save.mutate(v))} className="grid gap-4">
          <FormRow>
            <Field label="Display name" error={form.formState.errors.displayName?.message}>
              <Input {...form.register("displayName")} />
            </Field>
            <Field label="Timezone" hint={browserZone !== form.watch("timezone") ? `Your device is on ${browserZone}` : "Daily stats, streaks and reminders use this"}>
              <Select {...form.register("timezone")}>{zones.map((z) => <option key={z}>{z}</option>)}</Select>
            </Field>
          </FormRow>
          <Field label="Bio">
            <Textarea {...form.register("bio")} />
          </Field>
          <div><Button type="submit" loading={save.isPending}>Save profile</Button></div>
        </form>
      </CardContent>
    </Card>
  );
}

function ScoreSection({ me }: { me: Me }) {
  const [enabled, setEnabled] = useState(me.settings.scoreEnabled);
  const [weights, setWeights] = useState<ScoreWeights>(me.settings.scoreWeights);
  const [studyGoal, setStudyGoal] = useState(me.settings.dailyStudyGoalMin);
  const [currency, setCurrency] = useState(me.settings.currency);
  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  const save = useApiMutation(() => api("/users/me/settings", { method: "PATCH", body: { scoreEnabled: enabled, scoreWeights: weights, dailyStudyGoalMin: studyGoal, currency } }), { invalidate: [["me"]], success: "Preferences saved" });
  return (
    <Card id="score">
      <CardHeader title="Goals & LifeOS score" description="The score visualizes daily activity. You decide what counts — or switch it off." />
      <CardContent className="grid gap-5">
        <FormRow>
          <Field label="Daily study goal (minutes)">
            <Input type="number" min={0} max={1440} value={studyGoal} onChange={(e) => setStudyGoal(Math.max(0, Number(e.target.value) || 0))} />
          </Field>
          <Field label="Currency">
            <Select value={currency} onChange={(e) => setCurrency(e.target.value)}>{["INR", "USD", "EUR", "GBP", "JPY", "AUD", "CAD", "SGD", "AED"].map((c) => <option key={c}>{c}</option>)}</Select>
          </Field>
        </FormRow>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="size-4 accent-[var(--accent)]" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
          Show the LifeOS score
        </label>
        {enabled && (
          <fieldset className="grid gap-3">
            <legend className="mb-1 text-sm font-medium text-text-2">Weights (must add up to 100)</legend>
            {COMPONENTS.map(({ key, label }) => (
              <div key={key} className="grid grid-cols-[6rem_1fr_4rem] items-center gap-3">
                <label htmlFor={`w-${key}`} className="text-sm text-text-2">{label}</label>
                <input id={`w-${key}`} type="range" min={0} max={100} step={5} value={weights[key]} onChange={(e) => setWeights({ ...weights, [key]: Number(e.target.value) })} className="accent-[var(--accent)]" />
                <span className="tabular text-right text-sm">{weights[key]}</span>
              </div>
            ))}
            <p className={total === 100 ? "text-sm text-text-3" : "text-sm font-medium text-danger"} role="status">
              Total: <span className="tabular">{total}</span>{total !== 100 && ` — adjust by ${100 - total > 0 ? "+" : ""}${100 - total}`}
            </p>
            <p className="text-xs text-text-3">Modules with no data for a day are left out and the other weights scale up, so an empty module never drags the score down.</p>
          </fieldset>
        )}
        <div className="flex gap-2">
          <Button disabled={enabled && total !== 100} loading={save.isPending} onClick={() => save.mutate(undefined)}>Save</Button>
          <Button variant="ghost" onClick={() => setWeights({ routine: 20, habits: 20, fitness: 15, learning: 20, projects: 15, finance: 10 })}>Reset weights</Button>
        </div>
      </CardContent>
    </Card>
  );
}

function NotificationSection({ me }: { me: Me }) {
  const prefs = useApi<NotificationPreferences>(["notifications", "preferences"], "/notifications/preferences");
  const [quiet, setQuiet] = useState({ start: me.settings.quietHoursStart ?? "", end: me.settings.quietHoursEnd ?? "" });
  const [summaries, setSummaries] = useState({ daily: me.settings.dailySummary, weekly: me.settings.weeklySummary });
  const saveSettings = useApiMutation(
    () => api("/users/me/settings", { method: "PATCH", body: { quietHoursStart: quiet.start || null, quietHoursEnd: quiet.end || null, dailySummary: summaries.daily, weeklySummary: summaries.weekly } }),
    { invalidate: [["me"]], success: "Notification settings saved" },
  );
  const toggle = useApiMutation((p: { category: string; enabled: boolean }) => api("/notifications/preferences", { method: "PUT", body: { preferences: [{ channel: "IN_APP", ...p }] } }), { invalidate: [["notifications"]] });
  const quietInvalid = Boolean(quiet.start) !== Boolean(quiet.end);
  return (
    <Card id="notifications">
      <CardHeader title="Notifications" description="LifeOS should help, not interrupt." />
      <CardContent className="grid gap-5">
        <fieldset className="grid gap-3">
          <legend className="mb-1 text-sm font-medium text-text-2">Quiet hours</legend>
          <FormRow>
            <Field label="From"><Input type="time" value={quiet.start} onChange={(e) => setQuiet({ ...quiet, start: e.target.value })} /></Field>
            <Field label="Until" error={quietInvalid ? "Set both times, or neither" : undefined}><Input type="time" value={quiet.end} onChange={(e) => setQuiet({ ...quiet, end: e.target.value })} /></Field>
          </FormRow>
          <p className="text-xs text-text-3">Non-critical notifications wait until quiet hours end.</p>
        </fieldset>
        <div className="grid gap-2 text-sm">
          <label className="flex items-center gap-2"><input type="checkbox" className="size-4 accent-[var(--accent)]" checked={summaries.daily} onChange={(e) => setSummaries({ ...summaries, daily: e.target.checked })} /> Daily review at 21:00</label>
          <label className="flex items-center gap-2"><input type="checkbox" className="size-4 accent-[var(--accent)]" checked={summaries.weekly} onChange={(e) => setSummaries({ ...summaries, weekly: e.target.checked })} /> Weekly review on Sunday at 18:00</label>
        </div>
        <div><Button disabled={quietInvalid} loading={saveSettings.isPending} onClick={() => saveSettings.mutate(undefined)}>Save</Button></div>
        <div>
          <p className="mb-2 text-sm font-medium text-text-2">Categories</p>
          {!prefs.data ? (
            <LoadingState rows={2} className="p-0" />
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {prefs.data.categories.map((c) => (
                <li key={c.category}>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" className="size-4 accent-[var(--accent)]" checked={c.enabled} onChange={(e) => toggle.mutate({ category: c.category, enabled: e.target.checked })} />
                    {humanize(c.category)}
                  </label>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-xs text-text-3">Delivery channel: in-app. Push and email delivery are planned for a later release.</p>
        </div>
      </CardContent>
    </Card>
  );
}

const passwordSchema = z
  .object({ currentPassword: z.string().min(1, "Required"), newPassword: z.string().min(8, "Use at least 8 characters").max(128), confirm: z.string() })
  .refine((v) => v.newPassword === v.confirm, { path: ["confirm"], message: "Passwords don't match" });

function SecuritySection() {
  const router = useRouter();
  const form = useForm({ resolver: zodResolver(passwordSchema), defaultValues: { currentPassword: "", newPassword: "", confirm: "" } });
  const change = useApiMutation((v: z.output<typeof passwordSchema>) => api("/users/me/password", { method: "POST", body: { currentPassword: v.currentPassword, newPassword: v.newPassword } }), {
    success: "Password changed — please log in again",
    onSuccess: async () => {
      await logout();
      router.replace("/login");
    },
  });
  const errors = form.formState.errors;
  return (
    <Card id="security">
      <CardHeader title="Password" description="Changing it signs you out on every device." />
      <CardContent>
        <form onSubmit={form.handleSubmit((v) => change.mutate(v))} className="grid gap-4">
          <Field label="Current password" error={errors.currentPassword?.message}><Input type="password" autoComplete="current-password" {...form.register("currentPassword")} /></Field>
          <FormRow>
            <Field label="New password" error={errors.newPassword?.message}><Input type="password" autoComplete="new-password" {...form.register("newPassword")} /></Field>
            <Field label="Confirm new password" error={errors.confirm?.message}><Input type="password" autoComplete="new-password" {...form.register("confirm")} /></Field>
          </FormRow>
          <div><Button type="submit" loading={change.isPending}>Change password</Button></div>
        </form>
      </CardContent>
    </Card>
  );
}

function DataSection() {
  const router = useRouter();
  const client = useQueryClient();
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const exportData = async () => {
    setExporting(true);
    try {
      const data = await api<unknown>("/users/me/export");
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
      const a = Object.assign(document.createElement("a"), { href: url, download: `lifeos-export-${new Date().toISOString().slice(0, 10)}.json` });
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setExporting(false);
    }
  };

  const deleteAccount = async () => {
    setBusy(true);
    try {
      await api("/users/me", { method: "DELETE", body: { password } });
      await logout();
      client.clear();
      router.replace("/");
    } catch (e) {
      toast.error(errorMessage(e));
      setBusy(false);
    }
  };

  return (
    <Card id="data">
      <CardHeader title="Your data" />
      <CardContent className="grid gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-text-2">Download everything LifeOS stores about you as JSON.</p>
          <Button variant="secondary" loading={exporting} onClick={exportData}><Download className="size-4" /> Export data</Button>
        </div>
        <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-text-2">Permanently delete your account and all data.</p>
          <Button variant="danger" onClick={() => setDeleting(true)}>Delete account</Button>
        </div>
      </CardContent>
      <Dialog open={deleting} onClose={() => setDeleting(false)} title="Delete your account?" description="This permanently deletes every routine, habit, workout, session, project and financial record. It cannot be undone.">
        <form onSubmit={(e) => { e.preventDefault(); void deleteAccount(); }}>
          <Field label="Confirm with your password"><Input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
          <DialogActions>
            <Button variant="secondary" onClick={() => setDeleting(false)}>Cancel</Button>
            <Button type="submit" variant="danger" disabled={!password} loading={busy}>Delete everything</Button>
          </DialogActions>
        </form>
      </Dialog>
    </Card>
  );
}

function AppSection() {
  const canInstall = usePwa((s) => Boolean(s.installEvent));
  const installed = usePwa((s) => s.installed);
  const fullscreen = useFullscreen();
  const [ios, setIos] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- platform detection after mount
    setIos(/iphone|ipad|ipod/i.test(navigator.userAgent) && !isInstalledDisplay());
  }, []);
  return (
    <Card id="app">
      <CardHeader title="LifeOS app" description="Install LifeOS to open it full screen, without browser bars, from your home screen or dock." />
      <CardContent className="grid gap-3 text-sm">
        {installed ? (
          <p className="text-text-2">You&apos;re using the installed app.</p>
        ) : canInstall ? (
          <div><Button onClick={() => void promptInstall()}><Smartphone className="size-4" /> Install LifeOS</Button></div>
        ) : ios ? (
          <p className="text-text-2">On iPhone or iPad: tap <strong>Share</strong>, then <strong>Add to Home Screen</strong>.</p>
        ) : (
          <p className="text-text-2">In Chrome or Edge, use the install icon in the address bar (or the browser menu → <strong>Install LifeOS</strong>). Already installed? Open it from your apps.</p>
        )}
        {fullscreen.supported && (
          <div>
            <Button variant="secondary" onClick={fullscreen.toggle}><Maximize className="size-4" /> {fullscreen.active ? "Exit full screen" : "Use full screen in this tab"}</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AppearanceSection() {
  const [theme, setTheme] = useState<"system" | "light" | "dark">("system");
  // eslint-disable-next-line react-hooks/set-state-in-effect -- read saved theme after mount
  useEffect(() => setTheme(readTheme()), []);
  return (
    <Card>
      <CardHeader title="Appearance" />
      <CardContent>
        <Segmented label="Theme" value={theme} onChange={(t) => { applyTheme(t); setTheme(t); }} options={[{ value: "system", label: "System" }, { value: "light", label: "Light" }, { value: "dark", label: "Dark" }]} />
      </CardContent>
    </Card>
  );
}

export default function SettingsPage() {
  const me = useMe();
  if (me.isError) return <ErrorState error={me.error} onRetry={() => me.refetch()} />;
  if (!me.data) return <LoadingState rows={6} />;
  return (
    <>
      <PageHeader title="Settings" />
      <div className="grid max-w-3xl gap-5">
        <ProfileSection me={me.data} />
        <ScoreSection me={me.data} />
        <NotificationSection me={me.data} />
        <AppSection />
        <AppearanceSection />
        <SecuritySection />
        <DataSection />
      </div>
    </>
  );
}
