import { NextResponse, type NextRequest } from "next/server";

/** Non-secret hint cookie set by the API alongside the httpOnly refresh token. */
const SESSION_HINT = "lifeos_session";
const AUTH_PAGES = ["/login", "/register"];

/**
 * Optimistic redirects only. Real authorization happens in the API on every
 * request; a stale hint cookie just leads to a refresh failure and logout.
 */
const CLIENT_IP_HEADER = "x-lifeos-client-ip";
const PROXY_SECRET_HEADER = "x-lifeos-proxy-secret";

/**
 * API calls are proxied to the backend (next.config rewrites). Behind a host
 * like Vercel the backend only sees this server's IP, so pass the visitor's IP
 * along with a shared secret the API verifies before trusting it for rate
 * limiting. Client-sent copies of these headers are always discarded.
 */
function forwardToApi(request: NextRequest) {
  const headers = new Headers(request.headers);
  headers.delete(CLIENT_IP_HEADER);
  headers.delete(PROXY_SECRET_HEADER);
  const secret = process.env.PROXY_SECRET;
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip");
  if (secret && ip) {
    headers.set(CLIENT_IP_HEADER, ip);
    headers.set(PROXY_SECRET_HEADER, secret);
  }
  return NextResponse.next({ request: { headers } });
}

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (pathname.startsWith("/api/")) return forwardToApi(request);
  const hasSession = request.cookies.has(SESSION_HINT);

  if (AUTH_PAGES.includes(pathname)) {
    return hasSession ? NextResponse.redirect(new URL("/dashboard", request.url)) : NextResponse.next();
  }
  if (!hasSession) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", pathname + search);
    return NextResponse.redirect(login);
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/api/:path*",
    "/login",
    "/register",
    "/dashboard/:path*",
    "/today/:path*",
    "/routine/:path*",
    "/tasks/:path*",
    "/habits/:path*",
    "/fitness/:path*",
    "/learning/:path*",
    "/projects/:path*",
    "/finance/:path*",
    "/analytics/:path*",
    "/notifications/:path*",
    "/settings/:path*",
  ],
};
