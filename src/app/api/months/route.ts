/**
 * POST /api/months { month: "YYYY-MM", available_to_budget: number }
 * Upsert the month's "available to budget" input.
 */
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => ({}));
  if (!b.month) return NextResponse.json({ ok: false, error: "missing month" }, { status: 400 });
  const sb = getSupabaseAdmin();
  const { error } = await sb
    .from("budget_months")
    .upsert(
      { month: b.month, available_to_budget: Number(b.available_to_budget) || 0, updated_at: new Date().toISOString() },
      { onConflict: "month" }
    );
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
