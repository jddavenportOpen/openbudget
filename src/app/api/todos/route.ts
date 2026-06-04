/**
 * Financial to-do CRUD.
 *  POST   { title, detail?, amount? }            -> create (open)
 *  PATCH  { id, status?, title?, detail?, amount? } -> update / close
 *  DELETE { id }
 */
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => ({}));
  if (!b.title) return NextResponse.json({ ok: false, error: "missing title" }, { status: 400 });
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("budget_todos")
    .insert({
      title: String(b.title).trim(),
      detail: b.detail ?? null,
      amount: b.amount != null ? Number(b.amount) : null,
      status: "open",
      sort_order: 100,
    })
    .select("id")
    .limit(1);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, id: data?.[0]?.id });
}

export async function PATCH(req: NextRequest) {
  const b = await req.json().catch(() => ({}));
  if (!b.id) return NextResponse.json({ ok: false, error: "missing id" }, { status: 400 });
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (b.status !== undefined) patch.status = b.status;
  if (b.title !== undefined) patch.title = String(b.title).trim();
  if (b.detail !== undefined) patch.detail = b.detail;
  if (b.amount !== undefined) patch.amount = b.amount != null ? Number(b.amount) : null;
  const sb = getSupabaseAdmin();
  const { error } = await sb.from("budget_todos").update(patch).eq("id", b.id);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const b = await req.json().catch(() => ({}));
  if (!b.id) return NextResponse.json({ ok: false, error: "missing id" }, { status: 400 });
  const sb = getSupabaseAdmin();
  const { error } = await sb.from("budget_todos").delete().eq("id", b.id);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
