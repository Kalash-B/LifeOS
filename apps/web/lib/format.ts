import { useAuth } from "./auth-store";

/** Timezone of the signed-in user (falls back to the browser's). */
export function userTimeZone(): string {
  return useAuth.getState().user?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/** Local "YYYY-MM-DD" for an instant in the user's timezone. */
export function dateKey(date: Date = new Date(), timeZone = userTimeZone()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

/** Parse a "YYYY-MM-DD" key as a calendar date (no timezone shift). */
function keyToDate(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12));
}

export function formatDateKey(key: string, options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" }) {
  return new Intl.DateTimeFormat("en-US", { ...options, timeZone: "UTC" }).format(keyToDate(key));
}

export function weekdayShort(key: string) {
  return formatDateKey(key, { weekday: "short" });
}

export function formatDate(iso: string | null | undefined, options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" }) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-US", { ...options, timeZone: userTimeZone() }).format(new Date(iso));
}

export function formatDateTime(iso: string | null | undefined) {
  return formatDate(iso, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export function formatTime(iso: string) {
  return formatDate(iso, { hour: "numeric", minute: "2-digit" });
}

export function relativeTime(iso: string) {
  const diff = (new Date(iso).getTime() - Date.now()) / 1000;
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  const abs = Math.abs(diff);
  if (abs < 60) return rtf.format(Math.round(diff), "second");
  if (abs < 3600) return rtf.format(Math.round(diff / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), "hour");
  if (abs < 86400 * 30) return rtf.format(Math.round(diff / 86400), "day");
  return formatDate(iso);
}

export function formatMoney(amount: number, currency = "INR", compact = false) {
  return new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: compact ? 1 : 2,
    minimumFractionDigits: compact ? 0 : undefined,
    notation: compact ? "compact" : "standard",
  }).format(amount);
}

export function formatMinutes(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

export function formatNumber(value: number, digits = 0) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: digits }).format(value);
}

/** Converts a datetime-local input value to ISO (interpreted in the browser's zone). */
export function localInputToIso(value: string) {
  return new Date(value).toISOString();
}

/** Current time formatted for a datetime-local input. */
export function nowForInput(offsetMinutes = 0) {
  const d = new Date(Date.now() + offsetMinutes * 60_000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function humanize(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((word, index) => (index === 0 ? word[0].toUpperCase() + word.slice(1) : word))
    .join(" ");
}

export function greeting(date = new Date(), timeZone = userTimeZone()) {
  const hour = Number(new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", hourCycle: "h23" }).format(date));
  if (hour < 5) return "Good night";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

/** ISO instant → datetime-local input value in the browser's zone. */
export function isoToLocalInput(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** True when an open item's due instant has passed. */
export function isOverdue(dueIso: string | null | undefined, done = false) {
  return Boolean(dueIso && !done && new Date(dueIso).getTime() < Date.now());
}
