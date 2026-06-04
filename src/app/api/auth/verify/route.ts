/**
 * GET /api/auth/verify?token=…
 * Validate single-use token, re-check allowlist, set signed httpOnly session
 * cookie (180d), redirect to /. Any failure → /login?error=… with no session.
 */
import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, isAllowed, signSession } from "@/lib/auth";
import { consumeToken } from "@/lib/magic";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function loginRedirect(req: NextRequest, error: string): NextResponse {
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = `?error=${encodeURIComponent(error)}`;
  return NextResponse.redirect(url);
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") || "";
  if (!token) return loginRedirect(req, "invalid");

  let result;
  try {
    result = await consumeToken(token);
  } catch (e) {
    console.error("[auth/verify] consume error:", e);
    return loginRedirect(req, "invalid");
  }

  if (!result.ok) {
    const reason =
      result.reason === "expired" ? "expired" : result.reason === "used" ? "used" : "invalid";
    return loginRedirect(req, reason);
  }
  if (!isAllowed(result.email)) {
    return loginRedirect(req, "invalid");
  }

  const session = await signSession(result.email);
  const home = req.nextUrl.clone();
  home.pathname = "/";
  home.search = "";
  const res = NextResponse.redirect(home);
  res.cookies.set(SESSION_COOKIE, session, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 180 * 24 * 60 * 60,
  });
  return res;
}
