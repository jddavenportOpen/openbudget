/**
 * magic.ts — magic-link token persistence + email send.
 *
 * Single-use tokens live in the `magic_tokens` table (sha256(token), 15-min
 * expiry, used flag). The raw token only ever lives in the emailed link.
 *
 * Email goes through Resend from MAGIC_FROM_EMAIL. The from-domain must be
 * verified in your Resend account (or use the onboarding@resend.dev sandbox for
 * testing). See SETUP.md.
 */
import { getSupabaseAdmin } from "@/lib/supabase";
import { generateRawToken, hashToken } from "@/lib/auth";

const TOKEN_TTL_MS = 15 * 60 * 1000; // 15 minutes
const TOKENS_TABLE = "magic_tokens"; // single-use token store

export interface MintedToken {
  rawToken: string;
  expiresAt: string;
}

export async function mintToken(email: string): Promise<MintedToken> {
  const rawToken = generateRawToken();
  const tokenHash = await hashToken(rawToken);
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS).toISOString();
  const sb = getSupabaseAdmin();
  const { error } = await sb.from(TOKENS_TABLE).insert({
    token_hash: tokenHash, email, expires_at: expiresAt, used: false,
  });
  if (error) throw new Error(`mintToken insert failed: ${error.message}`);
  return { rawToken, expiresAt };
}

export type ConsumeResult =
  | { ok: true; email: string }
  | { ok: false; reason: "missing" | "expired" | "used" };

export async function consumeToken(rawToken: string): Promise<ConsumeResult> {
  const tokenHash = await hashToken(rawToken);
  const sb = getSupabaseAdmin();
  const { data: rows, error } = await sb
    .from(TOKENS_TABLE)
    .select("token_hash,email,expires_at,used")
    .eq("token_hash", tokenHash)
    .limit(1);
  if (error || !rows || rows.length === 0) return { ok: false, reason: "missing" };
  const row = rows[0] as { token_hash: string; email: string; expires_at: string; used: boolean };
  if (row.used) return { ok: false, reason: "used" };
  if (new Date(row.expires_at).getTime() < Date.now()) return { ok: false, reason: "expired" };
  const { data: updated, error: updErr } = await sb
    .from(TOKENS_TABLE)
    .update({ used: true })
    .eq("token_hash", tokenHash)
    .eq("used", false)
    .select("token_hash");
  if (updErr || !updated || updated.length === 0) return { ok: false, reason: "used" };
  return { ok: true, email: row.email };
}

export async function sendMagicLinkEmail(email: string, link: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY not set");
  const from =
    process.env.MAGIC_FROM_EMAIL || process.env.BUDGET_FROM_EMAIL || "onboarding@resend.dev";
  const appName = process.env.NEXT_PUBLIC_APP_NAME || "OpenBudget";
  const html = `<!DOCTYPE html>
<html><body style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;color:#1e293b;max-width:540px;margin:0 auto;padding:16px">
  <div style="background:linear-gradient(135deg,#0f766e,#115e59);padding:22px 24px;border-radius:14px;color:#fff">
    <h1 style="margin:0;font-size:22px">${appName}</h1>
    <p style="margin:6px 0 0;opacity:.9">Your one-tap login link</p>
  </div>
  <p style="margin-top:20px">Tap below to sign in. Good for 15 minutes, single use.</p>
  <p style="margin:24px 0">
    <a href="${link}" style="display:inline-block;background:#0f766e;color:#fff;text-decoration:none;padding:12px 24px;border-radius:10px;font-weight:600">Sign in</a>
  </p>
  <p style="font-size:13px;color:#64748b">Or paste this into your browser:<br>
    <a href="${link}" style="color:#0f766e;word-break:break-all">${link}</a></p>
  <p style="margin-top:28px;font-size:12px;color:#94a3b8">If you didn&apos;t request this, you can safely ignore it.</p>
</body></html>`;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [email], subject: `Your ${appName} login link`, html }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Resend send failed: ${res.status} ${text.slice(0, 200)}`);
  }
}
