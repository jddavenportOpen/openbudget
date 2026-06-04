"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Home, ShoppingCart, Sparkles, PiggyBank, Mail, Trash2, Plus, type LucideIcon } from "lucide-react";

import type { EnvelopeWithMath } from "@/lib/types";
import { money } from "@/lib/format";

const GROUPS = ["Fixed", "Variable", "Discretionary", "Savings"];
const GROUP_ICON: Record<string, LucideIcon> = {
  Fixed: Home,
  Variable: ShoppingCart,
  Discretionary: Sparkles,
  Savings: PiggyBank,
};

export default function BudgetManager({
  initial,
  availableToBudget,
}: {
  initial: EnvelopeWithMath[];
  availableToBudget: number;
}) {
  const router = useRouter();
  const [envs, setEnvs] = useState<EnvelopeWithMath[]>(initial);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newGrp, setNewGrp] = useState("Variable");

  const totalAllocated = useMemo(
    () => envs.reduce((s, e) => s + e.monthly_allocated, 0),
    [envs]
  );
  const tbb = availableToBudget - totalAllocated;

  async function setAllocation(id: string, val: number) {
    setEnvs((prev) => prev.map((e) => (e.id === id ? { ...e, monthly_allocated: val, remaining: val - e.spent } : e)));
    await fetch("/api/envelopes", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, monthly_allocated: val }),
    }).catch(() => {});
  }

  async function addEnvelope() {
    if (!newName.trim()) return;
    const res = await fetch("/api/envelopes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim(), grp: newGrp }),
    });
    const data = await res.json().catch(() => ({}));
    if (data?.id) {
      setEnvs((prev) => [
        ...prev,
        { id: data.id, name: newName.trim(), grp: newGrp, monthly_allocated: 0, sort_order: 999, spent: 0, remaining: 0 },
      ]);
    }
    setNewName("");
    setAdding(false);
    router.refresh();
  }

  async function removeEnvelope(id: string) {
    if (!confirm("Delete this envelope? Past transactions keep their history.")) return;
    setEnvs((prev) => prev.filter((e) => e.id !== id));
    await fetch("/api/envelopes", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    }).catch(() => {});
    router.refresh();
  }

  const byGroup = GROUPS.map((g) => ({ g, items: envs.filter((e) => e.grp === g) })).filter(
    (x) => x.items.length > 0
  );
  const ungrouped = envs.filter((e) => !GROUPS.includes(e.grp));
  if (ungrouped.length) byGroup.push({ g: "Other", items: ungrouped });

  return (
    <div>
      {/* summary */}
      <div className="card p-4 flex items-center justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-wider text-slate2 font-semibold">To Be Budgeted</p>
          <p className={`text-2xl font-bold tnum ${tbb < 0 ? "text-red-600" : "text-teal-700"}`}>
            {money(tbb)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[11px] text-slate2">Allocated / Available</p>
          <p className="text-sm font-semibold tnum text-ink">
            {money(totalAllocated)} <span className="text-slate2">/ {money(availableToBudget)}</span>
          </p>
        </div>
      </div>

      {byGroup.map(({ g, items }) => {
        const GIcon = GROUP_ICON[g] ?? Mail;
        return (
        <section key={g} className="mt-5">
          <h2 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate2 mb-2 px-1">
            <GIcon size={13} strokeWidth={2.2} className="text-teal-600/80" />
            {g}
          </h2>
          <div className="card divide-y divide-teal-900/5">
            {items.map((e) => {
              const over = e.remaining < 0;
              const pct = e.monthly_allocated > 0 ? Math.min(100, (e.spent / e.monthly_allocated) * 100) : 0;
              return (
                <div key={e.id} className="px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-ink truncate">{e.name}</p>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-slate2 text-sm">$</span>
                      <input
                        inputMode="decimal"
                        defaultValue={e.monthly_allocated || ""}
                        onBlur={(ev) =>
                          setAllocation(e.id, Number(ev.target.value.replace(/[^0-9.]/g, "")) || 0)
                        }
                        placeholder="0"
                        className="w-20 text-right text-sm tnum rounded-lg border border-teal-600/30 px-2 py-1 bg-white focus:outline-none focus:border-teal-600"
                      />
                      <button
                        onClick={() => removeEnvelope(e.id)}
                        className="text-slate2/50 hover:text-red-500 px-1"
                        title="Delete envelope"
                      >
                        <Trash2 size={15} strokeWidth={2} />
                      </button>
                    </div>
                  </div>
                  <div className="mt-2 h-1.5 rounded-full bg-teal-900/10 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${over ? "bg-red-500" : "bg-teal-600"}`}
                      style={{ width: `${over ? 100 : pct}%` }}
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-slate2 tnum">
                    spent {money(e.spent)} ·{" "}
                    <span className={over ? "text-red-600 font-semibold" : "text-teal-700"}>
                      {over ? `${money(Math.abs(e.remaining))} over` : `${money(e.remaining)} left`}
                    </span>
                  </p>
                </div>
              );
            })}
          </div>
        </section>
        );
      })}

      {/* add envelope */}
      <div className="mt-5">
        {adding ? (
          <div className="card p-4 space-y-2">
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Envelope name (e.g. Vacation)"
              className="w-full min-h-[44px] px-3 rounded-xl border border-teal-600/30 bg-white text-sm focus:outline-none focus:border-teal-600"
            />
            <div className="flex gap-2">
              <select
                value={newGrp}
                onChange={(e) => setNewGrp(e.target.value)}
                className="flex-1 min-h-[44px] px-2 rounded-xl border border-teal-600/30 bg-white text-sm"
              >
                {GROUPS.map((g) => (
                  <option key={g}>{g}</option>
                ))}
              </select>
              <button onClick={addEnvelope} className="min-h-[44px] px-4 rounded-xl bg-teal-700 text-white text-sm font-semibold">
                Add
              </button>
              <button onClick={() => setAdding(false)} className="min-h-[44px] px-3 text-sm text-slate2">
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="w-full min-h-[48px] inline-flex items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-teal-600/30 text-teal-700 font-semibold text-sm"
          >
            <Plus size={16} strokeWidth={2.4} />
            New envelope
          </button>
        )}
      </div>
    </div>
  );
}
