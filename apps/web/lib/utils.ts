import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Optional numeric form field: "" / NaN → undefined. */
export function toOptionalNumber(value: unknown) {
  if (value === "" || value === null || value === undefined) return undefined;
  const n = Number(value);
  return Number.isNaN(n) ? undefined : n;
}

/** Drops empty-string fields so optional API fields are omitted rather than sent as "". */
export function compact<T extends Record<string, unknown>>(values: T): Partial<T> {
  return Object.fromEntries(Object.entries(values).filter(([, value]) => value !== "" && value !== undefined)) as Partial<T>;
}
