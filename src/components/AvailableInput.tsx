"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AvailableInput({
  month,
  initial,
}: {
  month: string;
  initial: number;
}) {
  const router = useRouter();
  const [value, setValue] = useState(initial ? String(initial) : "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    setSaving(true);
    setSaved(false);
    try {
      await fetch("/api/months", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month, available_to_budget: Number(value) || 0 }),
      });
      setSaved(true);
      router.refresh();
      setTimeout(() => setSaved(false), 1800);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <div className="relative flex-1">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate2">$</span>
        <input
          inputMode="decimal"
          value={value}
          onChange={(e) => setValue(e.target.value.replace(/[^0-9.]/g, ""))}
          placeholder="0"
          className="w-full min-h-[44px] pl-7 pr-3 rounded-xl border border-teal-600/30 bg-white text-base tnum focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-500/30"
        />
      </div>
      <button
        onClick={save}
        disabled={saving}
        className="min-h-[44px] px-4 rounded-xl bg-teal-700 text-white text-sm font-semibold disabled:opacity-60"
      >
        {saving ? "…" : saved ? "Saved ✓" : "Set"}
      </button>
    </div>
  );
}
