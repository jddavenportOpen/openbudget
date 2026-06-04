/**
 * Bank-login reference vault. NODE runtime, gated by middleware (allowlisted only).
 * GET    -> list entries (never returns plaintext secrets, only has_secret flag)
 * POST   { bank_name, username?, password?, notes? } -> create entry
 * PATCH  { id, username?, password?, notes? }         -> update (password encrypted at rest)
 * DELETE { id }                                       -> remove entry
 *
 * This is manual reference ONLY — the app never uses these to automate bank access.
 */
import { NextRequest, NextResponse } from "next/server";
import {
  listVault,
  createVaultEntry,
  updateVaultEntry,
  deleteVaultEntry,
  vaultEnabled,
} from "@/lib/vault";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const entries = await listVault();
  return NextResponse.json({ ok: true, enabled: vaultEnabled(), entries });
}

export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => ({}));
  if (!b.bank_name)
    return NextResponse.json({ ok: false, error: "missing bank_name" }, { status: 400 });
  if (b.password && !vaultEnabled()) {
    return NextResponse.json(
      { ok: false, error: "Vault locked: BUDGET_VAULT_KEY not set" },
      { status: 400 }
    );
  }
  const id = await createVaultEntry({
    bank_name: String(b.bank_name),
    username: b.username,
    password: b.password,
    notes: b.notes,
  });
  return NextResponse.json({ ok: true, id });
}

export async function PATCH(req: NextRequest) {
  if (!vaultEnabled()) {
    return NextResponse.json({ ok: false, error: "Vault locked: BUDGET_VAULT_KEY not set" }, { status: 400 });
  }
  const b = await req.json().catch(() => ({}));
  if (!b.id) return NextResponse.json({ ok: false, error: "missing id" }, { status: 400 });
  await updateVaultEntry(b.id, {
    username: b.username,
    password: b.password,
    notes: b.notes,
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const b = await req.json().catch(() => ({}));
  if (!b.id) return NextResponse.json({ ok: false, error: "missing id" }, { status: 400 });
  await deleteVaultEntry(b.id);
  return NextResponse.json({ ok: true });
}
