/**
 * POST /api/auth/request { email }
 * Non-allowed → generic 200 (no enumeration, no token, no email).
 * Allowed → mint single-use token + email magic link. In dev-link mode
 * (BUDGET_DEV_MAGIC_LINK=true), the link is also returned in JSON so you can
 * test sign-in before your email domain is verified in Resend.
 */
import { NextRequest, NextResponse } from "next/server";
import { isAllowed, normalizeEmail } from "@/lib/auth";
import { mintToken, sendMagicLinkEmail } from "@/lib/magic";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GENERIC = {
  ok: true,
  message: "If that email is allowed, a sign-in link is on its way.",
};

function siteUrl(req: NextRequest): string {
  const env = process.env.NEXT_PUBLIC_SITE_URL;
  if (env) return env.replace(/\/$/, "");
  return req.nextUrl.origin;
}

export async function POST(req: NextRequest) {
  let email = "";
  try {
    const body = (await req.json()) as { email?: string };
    email = normalizeEmail(body.email || "");
  } catch {
    return NextResponse.json(GENERIC);
  }

  if (!email || !isAllowed(email)) {
    return NextResponse.json(GENERIC);
  }

  try {
    const { rawToken } = await mintToken(email);
    const link = `${siteUrl(req)}/api/auth/verify?token=${rawToken}`;
    const devMode = process.env.BUDGET_DEV_MAGIC_LINK === "true";
    let emailSent = false;
    try {
      await sendMagicLinkEmail(email, link);
      emailSent = true;
    } catch (e) {
      console.error("[auth/request] email send failed:", e);
    }
    if (devMode) {
      return NextResponse.json({ ...GENERIC, dev_magic_link: link, email_sent: emailSent });
    }
    return NextResponse.json(GENERIC);
  } catch (e) {
    console.error("[auth/request] mint failed:", e);
    return NextResponse.json(GENERIC);
  }
}
