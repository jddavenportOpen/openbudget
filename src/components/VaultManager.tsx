"use client";

import { useState } from "react";
import { Lock, Eye, EyeOff, Pencil, Plus, Trash2 } from "lucide-react";

import type { VaultEntry } from "@/lib/vault";

export default function VaultManager({
  initial,
  enabled,
}: {
  initial: VaultEntry[];
  enabled: boolean;
}) {
  const [entries, setEntries] = useState<VaultEntry[]>(initial);
  const [editing, setEditing] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<Record<string, string>>({});
  const [draft, setDraft] = useState<{ username: string; password: string; notes: string }>({
    username: "", password: "", notes: "",
  });
  const [adding, setAdding] = useState(false);
  const [newEntry, setNewEntry] = useState<{ bank_name: string; username: string; password: string; notes: string }>({
    bank_name: "", username: "", password: "", notes: "",
  });

  async function reveal(id: string) {
    if (revealed[id] !== undefined) {
      setRevealed((r) => { const c = { ...r }; delete c[id]; return c; });
      return;
    }
    const res = await fetch("/api/vault/reveal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    const data = await res.json().catch(() => ({}));
    setRevealed((r) => ({ ...r, [id]: data?.password || "" }));
  }

  function startEdit(e: VaultEntry) {
    setEditing(e.id);
    setDraft({ username: e.username, password: "", notes: e.notes });
  }

  async function save(id: string) {
    await fetch("/api/vault", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...draft }),
    });
    setEntries((prev) =>
      prev.map((e) =>
        e.id === id
          ? { ...e, username: draft.username, notes: draft.notes, has_secret: draft.password ? true : e.has_secret }
          : e
      )
    );
    setEditing(null);
    setRevealed((r) => { const c = { ...r }; delete c[id]; return c; });
  }

  async function addEntry() {
    if (!newEntry.bank_name.trim()) return;
    const res = await fetch("/api/vault", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newEntry),
    });
    const data = await res.json().catch(() => ({}));
    if (data?.ok && data.id) {
      setEntries((prev) => [
        ...prev,
        {
          id: data.id,
          bank_name: newEntry.bank_name.trim(),
          username: newEntry.username,
          has_secret: !!newEntry.password,
          notes: newEntry.notes,
        },
      ]);
    }
    setNewEntry({ bank_name: "", username: "", password: "", notes: "" });
    setAdding(false);
  }

  async function remove(id: string) {
    if (!confirm("Delete this vault entry?")) return;
    await fetch("/api/vault", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }

  return (
    <div>
      <div className="card p-4 mb-4 bg-gradient-to-br from-teal-50 to-white">
        <p className="flex items-start gap-1.5 text-sm text-ink leading-relaxed">
          <Lock size={15} strokeWidth={2.2} className="text-teal-700 shrink-0 mt-0.5" />
          <span>
            A private place to keep <strong>your own</strong> bank logins so anyone in your
            household can sign in to an account directly.
          </span>
        </p>
        <p className="text-[11px] text-slate2 mt-2 leading-relaxed">
          Passwords are encrypted (AES-256) before they&apos;re saved and only ever shown to people
          on your allowlist. This app <strong>never</strong> uses them — your live balances come
          from a separate read-only bank connection. Manual reference only.
        </p>
      </div>

      {!enabled && (
        <div className="card p-4 mb-4 border-amber-200 bg-amber-50/60">
          <p className="text-sm text-amber-800">
            Vault is locked — an encryption key isn&apos;t set yet. Set
            <code className="mx-1 px-1 bg-amber-100 rounded">BUDGET_VAULT_KEY</code> on your host to
            enable saving passwords. You can still record usernames &amp; notes.
          </p>
        </div>
      )}

      <div className="space-y-3">
        {entries.map((e) => (
          <div key={e.id} className="card p-4">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-ink">{e.bank_name}</p>
              <div className="flex items-center gap-3">
                {editing !== e.id && (
                  <button onClick={() => startEdit(e)} className="inline-flex items-center gap-1 text-xs text-teal-700">
                    <Pencil size={12} strokeWidth={2.2} />
                    Edit
                  </button>
                )}
                <button onClick={() => remove(e.id)} className="inline-flex items-center gap-1 text-xs text-slate2 hover:text-red-600">
                  <Trash2 size={12} strokeWidth={2.2} />
                </button>
              </div>
            </div>

            {editing === e.id ? (
              <div className="mt-3 space-y-2">
                <input
                  value={draft.username}
                  onChange={(ev) => setDraft((d) => ({ ...d, username: ev.target.value }))}
                  placeholder="Username / email"
                  autoComplete="off"
                  className="w-full min-h-[42px] px-3 rounded-xl border border-teal-600/30 bg-white text-sm"
                />
                <input
                  type="password"
                  value={draft.password}
                  onChange={(ev) => setDraft((d) => ({ ...d, password: ev.target.value }))}
                  placeholder={e.has_secret ? "Password (leave blank to keep current)" : "Password"}
                  autoComplete="new-password"
                  disabled={!enabled}
                  className="w-full min-h-[42px] px-3 rounded-xl border border-teal-600/30 bg-white text-sm disabled:opacity-50"
                />
                <input
                  value={draft.notes}
                  onChange={(ev) => setDraft((d) => ({ ...d, notes: ev.target.value }))}
                  placeholder="Notes (e.g. security questions, 2FA phone)"
                  className="w-full min-h-[42px] px-3 rounded-xl border border-teal-600/30 bg-white text-sm"
                />
                <div className="flex gap-2">
                  <button onClick={() => save(e.id)} className="min-h-[42px] px-4 rounded-xl bg-teal-700 text-white text-sm font-semibold">
                    Save
                  </button>
                  <button onClick={() => setEditing(null)} className="min-h-[42px] px-3 text-sm text-slate2">
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-2 space-y-1 text-sm">
                <p className="text-slate2">
                  User: <span className="text-ink">{e.username || "—"}</span>
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-slate2">Password:</span>
                  {e.has_secret ? (
                    <>
                      <span className="text-ink font-mono">
                        {revealed[e.id] !== undefined ? revealed[e.id] || "(empty)" : "••••••••"}
                      </span>
                      <button onClick={() => reveal(e.id)} className="inline-flex items-center gap-1 text-xs text-teal-700">
                        {revealed[e.id] !== undefined ? <EyeOff size={12} strokeWidth={2.2} /> : <Eye size={12} strokeWidth={2.2} />}
                        {revealed[e.id] !== undefined ? "Hide" : "Show"}
                      </button>
                    </>
                  ) : (
                    <span className="text-slate2/60">not set</span>
                  )}
                </div>
                {e.notes && <p className="text-slate2 text-xs mt-1">{e.notes}</p>}
              </div>
            )}
          </div>
        ))}
      </div>

      {adding ? (
        <div className="card p-4 mt-3 space-y-2">
          <input
            value={newEntry.bank_name}
            onChange={(ev) => setNewEntry((d) => ({ ...d, bank_name: ev.target.value }))}
            placeholder="Bank name (e.g. your checking account)"
            className="w-full min-h-[42px] px-3 rounded-xl border border-teal-600/30 bg-white text-sm"
          />
          <input
            value={newEntry.username}
            onChange={(ev) => setNewEntry((d) => ({ ...d, username: ev.target.value }))}
            placeholder="Username / email"
            autoComplete="off"
            className="w-full min-h-[42px] px-3 rounded-xl border border-teal-600/30 bg-white text-sm"
          />
          <input
            type="password"
            value={newEntry.password}
            onChange={(ev) => setNewEntry((d) => ({ ...d, password: ev.target.value }))}
            placeholder={enabled ? "Password" : "Password (vault locked — set BUDGET_VAULT_KEY)"}
            autoComplete="new-password"
            disabled={!enabled}
            className="w-full min-h-[42px] px-3 rounded-xl border border-teal-600/30 bg-white text-sm disabled:opacity-50"
          />
          <input
            value={newEntry.notes}
            onChange={(ev) => setNewEntry((d) => ({ ...d, notes: ev.target.value }))}
            placeholder="Notes (optional)"
            className="w-full min-h-[42px] px-3 rounded-xl border border-teal-600/30 bg-white text-sm"
          />
          <div className="flex gap-2">
            <button onClick={addEntry} className="min-h-[42px] px-4 rounded-xl bg-teal-700 text-white text-sm font-semibold">
              Add
            </button>
            <button onClick={() => setAdding(false)} className="min-h-[42px] px-3 text-sm text-slate2">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="mt-3 w-full inline-flex items-center justify-center gap-1.5 min-h-[46px] rounded-xl border border-dashed border-teal-600/40 text-teal-700 text-sm font-semibold active:scale-[0.99] transition-transform"
        >
          <Plus size={15} strokeWidth={2.4} /> Add a bank
        </button>
      )}
    </div>
  );
}
