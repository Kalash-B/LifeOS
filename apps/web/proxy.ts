import { NextResponse, type NextRequest } from "next/server";

/** Non-secret hint cookie set by the API alongside the httpOnly refresh token. */
const SESSION_HINT = "lifeos_session";
const AUTH_PAGES = ["/login", "/register"];

/**
 * Optimistic redirects only. Real authorization happens in the API on every
 * request; a stale hint cookie just leads to a refresh failure and logout.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
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
