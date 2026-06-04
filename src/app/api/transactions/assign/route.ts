/**
 * POST /api/transactions/assign
 * Body: { id, envelope_id?: string|null, needs_review?: boolean }
 * Assigns a transaction to an envelope and/or toggles the review flag.
 * Setting envelope_id also sets assigned=true; clearing it sets assigned=false.
 */
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let body: { id?: string; envelope_id?: string | null; needs_review?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad json" }, { status: 400 });
  }
  if (!body.id) return NextResponse.json({ ok: false, error: "missing id" }, { status: 400 });

  const patch: Record<string, unknown> = {};
  if (body.envelope_id !== undefined) {
    patch.envelope_id = body.envelope_id || null;
    patch.assigned = !!body.envelope_id;
  }
  if (body.needs_review !== undefined) patch.needs_review = !!body.needs_review;
  if (Object.keys(patch).length === 0)
    return NextResponse.json({ ok: false, error: "nothing to update" }, { status: 400 });

  const sb = getSupabaseAdmin();
  const { error } = await sb.from("budget_transactions").update(patch).eq("id", body.id);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
