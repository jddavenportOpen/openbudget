/**
 * Envelopes CRUD.
 *  POST  { name, grp?, monthly_allocated? }            -> create
 *  PATCH { id, name?, grp?, monthly_allocated? }        -> update
 *  DELETE { id }                                        -> delete (txns keep history, envelope_id nulled by FK)
 */
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => ({}));
  if (!b.name) return NextResponse.json({ ok: false, error: "missing name" }, { status: 400 });
  const sb = getSupabaseAdmin();
  const { data: maxRow } = await sb
    .from("budget_envelopes").select("sort_order").order("sort_order", { ascending: false }).limit(1);
  const nextSort = (maxRow?.[0]?.sort_order ?? 0) + 1;
  const { data, error } = await sb
    .from("budget_envelopes")
    .insert({
      name: String(b.name).trim(),
      grp: b.grp || "Variable",
      monthly_allocated: Number(b.monthly_allocated) || 0,
      sort_order: nextSort,
    })
    .select("id")
    .limit(1);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, id: data?.[0]?.id });
}

export async function PATCH(req: NextRequest) {
  const b = await req.json().catch(() => ({}));
  if (!b.id) return NextResponse.json({ ok: false, error: "missing id" }, { status: 400 });
  const patch: Record<string, unknown> = {};
  if (b.name !== undefined) patch.name = String(b.name).trim();
  if (b.grp !== undefined) patch.grp = b.grp;
  if (b.monthly_allocated !== undefined) patch.monthly_allocated = Number(b.monthly_allocated) || 0;
  const sb = getSupabaseAdmin();
  const { error } = await sb.from("budget_envelopes").update(patch).eq("id", b.id);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const b = await req.json().catch(() => ({}));
  if (!b.id) return NextResponse.json({ ok: false, error: "missing id" }, { status: 400 });
  const sb = getSupabaseAdmin();
  const { error } = await sb.from("budget_envelopes").delete().eq("id", b.id);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
