/** Only allow same-origin relative paths as post-login destinations (prevents open redirects). */
export function safeNext(next: string | null | undefined, fallback = "/dashboard") {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  if (next === "/login" || next === "/register") return fallback;
  return next;
}
