/**
 * POST /api/vault/reveal { id } -> { ok, password }
 * Decrypts a single secret server-side for an authed, allowlisted session.
 * Plaintext is returned over the (TLS) response only — never logged, never stored.
 */
import { NextRequest, NextResponse } from "next/server";
import { revealSecret, vaultEnabled } from "@/lib/vault";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!vaultEnabled()) {
    return NextResponse.json({ ok: false, error: "Vault locked" }, { status: 400 });
  }
  const b = await req.json().catch(() => ({}));
  if (!b.id) return NextResponse.json({ ok: false, error: "missing id" }, { status: 400 });
  const password = await revealSecret(b.id);
  return NextResponse.json({ ok: true, password });
}
