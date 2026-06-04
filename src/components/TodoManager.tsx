"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Trash2, Plus } from "lucide-react";

import type { Todo } from "@/lib/types";
import { money0 } from "@/lib/format";

export default function TodoManager({ initial }: { initial: Todo[] }) {
  const router = useRouter();
  const [todos, setTodos] = useState<Todo[]>(initial);
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const [amount, setAmount] = useState("");

  async function toggle(t: Todo) {
    const status = t.status === "open" ? "done" : "open";
    setTodos((prev) => prev.map((x) => (x.id === t.id ? { ...x, status } : x)));
    await fetch("/api/todos", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: t.id, status }),
    }).catch(() => {});
    router.refresh();
  }

  async function add() {
    if (!title.trim()) return;
    const res = await fetch("/api/todos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title.trim(),
        detail: detail.trim() || null,
        amount: amount ? Number(amount) : null,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (data?.id) {
      setTodos((prev) => [
        ...prev,
        { id: data.id, title: title.trim(), detail: detail.trim() || null, amount: amount ? Number(amount) : null, status: "open", sort_order: 100 },
      ]);
    }
    setTitle(""); setDetail(""); setAmount(""); setAdding(false);
    router.refresh();
  }

  async function remove(id: string) {
    if (!confirm("Delete this item?")) return;
    setTodos((prev) => prev.filter((x) => x.id !== id));
    await fetch("/api/todos", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    }).catch(() => {});
  }

  const open = todos.filter((t) => t.status === "open");
  const done = todos.filter((t) => t.status === "done");
  const owed = open.reduce((s, t) => s + (t.amount || 0), 0);

  function Row({ t }: { t: Todo }) {
    const isDone = t.status === "done";
    return (
      <div className="px-4 py-3 flex items-start gap-3">
        <button
          onClick={() => toggle(t)}
          className={`mt-0.5 shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center ${
            isDone ? "bg-teal-600 border-teal-600 text-white" : "border-teal-600/40 text-transparent"
          }`}
          title={isDone ? "Mark open" : "Mark done"}
        >
          <Check size={14} strokeWidth={3} />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className={`text-sm font-medium ${isDone ? "line-through text-slate2" : "text-ink"}`}>
              {t.title}
            </p>
            {t.amount != null && (
              <span className="pill bg-teal-100 text-teal-800 shrink-0 tnum">{money0(t.amount)}</span>
            )}
          </div>
          {t.detail && <p className="text-[11px] text-slate2 mt-0.5 leading-relaxed">{t.detail}</p>}
        </div>
        <button onClick={() => remove(t.id)} className="text-slate2/40 hover:text-red-500 shrink-0 mt-0.5" title="Delete">
          <Trash2 size={16} strokeWidth={2} />
        </button>
      </div>
    );
  }

  return (
    <div>
      {owed > 0 && (
        <div className="card p-4 mb-4 bg-gradient-to-br from-teal-50 to-white">
          <p className="text-[11px] uppercase tracking-wider text-slate2 font-semibold">Money to recover</p>
          <p className="text-2xl font-bold tnum text-teal-700">{money0(owed)}</p>
          <p className="text-[11px] text-slate2 mt-0.5">across open reimbursements &amp; pay owed</p>
        </div>
      )}

      <div className="card divide-y divide-teal-900/5">
        {open.length === 0 && <p className="px-4 py-8 text-center text-sm text-slate2">All clear. 🎉</p>}
        {open.map((t) => <Row key={t.id} t={t} />)}
      </div>

      <div className="mt-4">
        {adding ? (
          <div className="card p-4 space-y-2">
            <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title (e.g. Costco refund)" className="w-full min-h-[44px] px-3 rounded-xl border border-teal-600/30 bg-white text-sm focus:outline-none focus:border-teal-600" />
            <input value={detail} onChange={(e) => setDetail(e.target.value)} placeholder="Detail (optional)" className="w-full min-h-[44px] px-3 rounded-xl border border-teal-600/30 bg-white text-sm focus:outline-none focus:border-teal-600" />
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate2">$</span>
                <input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))} placeholder="amount (optional)" className="w-full min-h-[44px] pl-7 pr-3 rounded-xl border border-teal-600/30 bg-white text-sm tnum focus:outline-none focus:border-teal-600" />
              </div>
              <button onClick={add} className="min-h-[44px] px-4 rounded-xl bg-teal-700 text-white text-sm font-semibold">Add</button>
              <button onClick={() => setAdding(false)} className="min-h-[44px] px-3 text-sm text-slate2">Cancel</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setAdding(true)} className="w-full min-h-[48px] inline-flex items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-teal-600/30 text-teal-700 font-semibold text-sm">
            <Plus size={16} strokeWidth={2.4} />
            New to-do
          </button>
        )}
      </div>

      {done.length > 0 && (
        <section className="mt-6">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate2 mb-2 px-1">Done</h2>
          <div className="card divide-y divide-teal-900/5 opacity-70">
            {done.map((t) => <Row key={t.id} t={t} />)}
          </div>
        </section>
      )}
    </div>
  );
}
