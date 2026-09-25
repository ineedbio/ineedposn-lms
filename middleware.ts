import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const path = req.nextUrl.pathname;

  // --- admin area: server-side role check, not a UI toggle ---
  if (path.startsWith("/admin") || path.startsWith("/api/admin")) {
    if (!token || token.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/login", req.url));
    }
  }

  // --- any signed-in-only area ---
  const requiresAuth = path.startsWith("/dashboard") || path.startsWith("/learn");
  if (requiresAuth && !token) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // --- device-lock: reject requests from a superseded session ---
  // jwt() callback in lib/auth.ts sets token.invalidated=true once another
  // device has logged in and overwritten currentSessionId in the DB.
  if (token?.invalidated) {
    const url = new URL("/login", req.url);
    url.searchParams.set("kicked", "1");
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/api/admin/:path*",
    "/dashboard/:path*",
    "/learn/:path*",
  ],
};
