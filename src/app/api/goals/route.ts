/**
 * PATCH /api/goals { id, current?, target?, title?, detail? }
 * Update goal progress (adjust as savings grow).
 */
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest) {
  const b = await req.json().catch(() => ({}));
  if (!b.id) return NextResponse.json({ ok: false, error: "missing id" }, { status: 400 });
  const patch: Record<string, unknown> = {};
  if (b.current !== undefined) patch.current = Number(b.current) || 0;
  if (b.target !== undefined) patch.target = b.target != null ? Number(b.target) : null;
  if (b.title !== undefined) patch.title = String(b.title).trim();
  if (b.detail !== undefined) patch.detail = b.detail;
  const sb = getSupabaseAdmin();
  const { error } = await sb.from("budget_goals").update(patch).eq("id", b.id);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
