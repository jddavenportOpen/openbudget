"use client";

import { useMemo, useState } from "react";
import {
  ArrowDownWideNarrow,
  Calendar,
  DollarSign,
  Tag,
  Flag,
  Star,
  Inbox,
} from "lucide-react";

import type { Account, Envelope, Transaction } from "@/lib/types";
import { money, dateLabel } from "@/lib/format";

type Filter = "all" | "unassigned" | "review" | string; // string = account name
type SortKey = "date" | "amount" | "category";

const SORTS: { key: SortKey; label: string; icon: typeof Calendar }[] = [
  { key: "date", label: "Date", icon: Calendar },
  { key: "amount", label: "Amount", icon: DollarSign },
  { key: "category", label: "Category", icon: Tag },
];

export default function TransactionList({
  initial,
  envelopes,
  accounts,
  initialFilter,
  lockedAccount,
}: {
  initial: Transaction[];
  envelopes: Envelope[];
  accounts: Account[];
  initialFilter?: Filter;
  /** When set (card drill-down), data is already scoped to one account — hide account chips. */
  lockedAccount?: string;
}) {
  const [txns, setTxns] = useState<Transaction[]>(initial);
  const [filter, setFilter] = useState<Filter>(initialFilter || "all");
  const [sort, setSort] = useState<SortKey>("date");
  const [busy, setBusy] = useState<string | null>(null);

  const primary = accounts.find((a) => a.is_primary)?.name;
  const envName = useMemo(() => {
    const m = new Map<string, string>();
    for (const e of envelopes) m.set(e.id, e.name);
    return m;
  }, [envelopes]);

  const filtered = useMemo(() => {
    let rows = txns;
    if (filter === "unassigned") rows = rows.filter((t) => t.amount < 0 && !t.envelope_id);
    else if (filter === "review") rows = rows.filter((t) => t.needs_review);
    else if (filter !== "all") rows = rows.filter((t) => t.account === filter);

    const sorted = [...rows];
    if (sort === "date") {
      // newest first (data arrives newest-first; keep it stable + explicit)
      sorted.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
    } else if (sort === "amount") {
      // biggest spend first → most negative amounts on top
      sorted.sort((a, b) => a.amount - b.amount);
    } else if (sort === "category") {
      const key = (t: Transaction) =>
        (t.envelope_id ? envName.get(t.envelope_id) : null) || t.category || "￿"; // unassigned sinks to bottom
      sorted.sort((a, b) => {
        const ka = key(a).toLowerCase();
        const kb = key(b).toLowerCase();
        if (ka < kb) return -1;
        if (ka > kb) return 1;
        return a.date < b.date ? 1 : -1;
      });
    }
    return sorted;
  }, [txns, filter, sort, envName]);

  function patchLocal(id: string, fields: Partial<Transaction>) {
    setTxns((prev) => prev.map((t) => (t.id === id ? { ...t, ...fields } : t)));
  }

  async function assign(id: string, envelope_id: string | null) {
    setBusy(id);
    patchLocal(id, { envelope_id, assigned: !!envelope_id });
    await fetch("/api/transactions/assign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, envelope_id }),
    }).catch(() => {});
    setBusy(null);
  }

  async function toggleReview(id: string, current: boolean) {
    patchLocal(id, { needs_review: !current });
    await fetch("/api/transactions/assign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, needs_review: !current }),
    }).catch(() => {});
  }

  const chips: { key: Filter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "unassigned", label: "Unassigned" },
    { key: "review", label: "Flagged" },
    ...(lockedAccount
      ? []
      : accounts.map((a) => ({ key: a.name as Filter, label: a.name.replace(/\s*\(\d+\)/, "") }))),
  ];

  return (
    <div>
      {/* filter chips */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 -mx-1 px-1">
        {chips.map((c) => {
          const active = filter === c.key;
          const isPrimaryChip = c.key === primary;
          return (
            <button
              key={String(c.key)}
              onClick={() => setFilter(c.key)}
              className={`shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                active
                  ? "bg-teal-700 text-white border-teal-700"
                  : isPrimaryChip
                  ? "bg-teal-50 text-teal-800 border-teal-300"
                  : "bg-white/70 text-slate2 border-teal-900/10"
              }`}
            >
              {isPrimaryChip && !active && <Star size={11} strokeWidth={2.4} />}
              {c.label}
            </button>
          );
        })}
      </div>

      {/* sort controls */}
      <div className="flex items-center gap-2 mt-3 -mx-1 px-1">
        <span className="inline-flex items-center gap-1 text-[11px] uppercase tracking-wider font-semibold text-slate2 shrink-0">
          <ArrowDownWideNarrow size={13} strokeWidth={2.2} />
          Sort
        </span>
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
          {SORTS.map((s) => {
            const active = sort === s.key;
            const Icon = s.icon;
            return (
              <button
                key={s.key}
                onClick={() => setSort(s.key)}
                className={`shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                  active
                    ? "bg-teal-700 text-white border-teal-700"
                    : "bg-white/70 text-slate2 border-teal-900/10"
                }`}
              >
                <Icon size={12} strokeWidth={2.2} />
                {s.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="card mt-3 divide-y divide-teal-900/5">
        {filtered.length === 0 && (
          <p className="px-4 py-10 flex flex-col items-center gap-2 text-sm text-slate2">
            <Inbox size={28} strokeWidth={1.6} className="text-teal-600/50" />
            Nothing here yet.
          </p>
        )}
        {filtered.map((t) => {
          const isPrimary = t.account === primary;
          const spend = t.amount < 0;
          return (
            <div key={t.id} className="px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink truncate">
                    {t.payee || t.description || "—"}
                  </p>
                  <p className="text-[11px] text-slate2 mt-0.5 flex items-center gap-1.5">
                    <span>{dateLabel(t.date)}</span>
                    {!lockedAccount && (
                      <>
                        <span className="opacity-40">·</span>
                        <span className={isPrimary ? "text-teal-700 font-medium inline-flex items-center gap-0.5" : ""}>
                          {isPrimary && <Star size={10} strokeWidth={2.4} />}
                          {(t.account || "").replace(/\s*\(\d+\)/, "")}
                        </span>
                      </>
                    )}
                  </p>
                </div>
                <span
                  className={`text-sm font-semibold tnum shrink-0 ${
                    spend ? "text-ink" : "text-teal-600"
                  }`}
                >
                  {money(t.amount, { sign: !spend })}
                </span>
              </div>

              <div className="flex items-center gap-2 mt-2">
                <select
                  value={t.envelope_id || ""}
                  disabled={busy === t.id}
                  onChange={(e) => assign(t.id, e.target.value || null)}
                  className={`flex-1 min-h-[36px] text-xs rounded-lg border px-2 bg-white ${
                    t.envelope_id
                      ? "border-teal-300 text-teal-800 font-medium"
                      : "border-amber-300 text-amber-700"
                  }`}
                >
                  <option value="">{spend ? "Assign envelope…" : "(income / refund)"}</option>
                  {envelopes.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => toggleReview(t.id, t.needs_review)}
                  className={`shrink-0 inline-flex items-center gap-1 min-h-[36px] px-2.5 rounded-lg text-xs font-medium border ${
                    t.needs_review
                      ? "bg-red-50 border-red-300 text-red-700"
                      : "bg-white border-teal-900/10 text-slate2"
                  }`}
                  title="Flag for review"
                >
                  <Flag size={13} strokeWidth={2.2} fill={t.needs_review ? "currentColor" : "none"} />
                  {t.needs_review ? "Review" : "Flag"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
