import type { AuthResponse, PageMeta } from "@/types/api";
import { useAuth } from "./auth-store";

const BASE = "/api/v1";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details: unknown[] = [],
  ) {
    super(message);
  }
}

type Query = Record<string, string | number | boolean | undefined | null>;

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  query?: Query;
}

export type RefreshResult = "ok" | "unauthenticated" | "unavailable";

let refreshing: Promise<RefreshResult> | null = null;

/**
 * Exchanges the httpOnly refresh cookie for a new access token. Single-flight.
 * Only a 401 means the session is over; rate limits, 5xx and network errors are
 * "unavailable" and must never sign the user out.
 */
export function refreshSession(): Promise<RefreshResult> {
  refreshing ??= (async (): Promise<RefreshResult> => {
    try {
      const response = await fetch(`${BASE}/auth/refresh`, { method: "POST", credentials: "same-origin" });
      if (response.status === 401) return "unauthenticated";
      if (!response.ok) return "unavailable";
      const { data } = (await response.json()) as { data: AuthResponse };
      useAuth.getState().setSession(data.accessToken, data.user, data.expiresIn);
      return "ok";
    } catch {
      return "unavailable";
    } finally {
      setTimeout(() => (refreshing = null), 0);
    }
  })();
  return refreshing;
}

function buildUrl(path: string, query?: Query) {
  const url = `${BASE}${path}`;
  if (!query) return url;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== "") params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `${url}?${qs}` : url;
}

async function send(path: string, options: RequestOptions, retry: boolean): Promise<Response> {
  const token = useAuth.getState().accessToken;
  const response = await fetch(buildUrl(path, options.query), {
    method: options.method ?? "GET",
    credentials: "same-origin",
    headers: {
      ...(options.body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  if (response.status === 401 && retry && !path.startsWith("/auth/")) {
    const result = await refreshSession();
    if (result === "ok") return send(path, options, false);
    if (result === "unavailable") return response;
    useAuth.getState().clear();
    if (typeof window !== "undefined") {
      const next = encodeURIComponent(window.location.pathname + window.location.search);
      // Runs outside React (no router available); a full navigation also resets client state.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.assign(`/login?next=${next}`);
    }
  }
  return response;
}

async function parse(response: Response) {
  const json = await response.json().catch(() => null);
  if (!response.ok || !json?.success) {
    const error = json?.error ?? {};
    throw new ApiError(
      response.status,
      error.code ?? "NETWORK_ERROR",
      error.message ?? (response.status >= 500 ? "Something went wrong. Please try again." : "Request failed."),
      error.details ?? [],
    );
  }
  return json as { data: unknown; meta?: PageMeta };
}

export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const json = await parse(await send(path, options, true));
  return json.data as T;
}

export async function apiPage<T>(path: string, options: RequestOptions = {}): Promise<{ data: T[]; meta: PageMeta }> {
  const json = await parse(await send(path, options, true));
  return { data: json.data as T[], meta: json.meta! };
}

export async function logout() {
  await fetch(`${BASE}/auth/logout`, { method: "POST", credentials: "same-origin" }).catch(() => undefined);
  useAuth.getState().clear();
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.details.length) return String(error.details[0]);
    return error.message;
  }
  return "Something went wrong. Please try again.";
}
