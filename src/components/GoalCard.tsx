import { Trophy, CheckCircle2 } from "lucide-react";

import { money0 } from "@/lib/format";
import type { Goal } from "@/lib/types";

export default function GoalCard({ goal }: { goal: Goal }) {
  const hasTarget = goal.target != null && goal.target > 0;
  const pct = hasTarget ? Math.min(100, Math.round((goal.current / (goal.target as number)) * 100)) : 0;
  const done = hasTarget && pct >= 100;
  return (
    <div className="card p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="flex items-center gap-1.5 font-semibold text-[15px] leading-snug text-ink">
          {done ? (
            <CheckCircle2 size={16} strokeWidth={2.2} className="text-teal-600 shrink-0" />
          ) : (
            <Trophy size={16} strokeWidth={2.2} className="text-teal-600/70 shrink-0" />
          )}
          {goal.title}
        </p>
        {hasTarget && (
          <span className="pill bg-teal-100 text-teal-800 shrink-0 tnum">{pct}%</span>
        )}
      </div>
      {goal.detail && <p className="text-xs text-slate2 mt-1.5 leading-relaxed">{goal.detail}</p>}
      {hasTarget && (
        <>
          <div className="mt-3 h-2 rounded-full bg-teal-900/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-teal-500 to-teal-700 transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="mt-1.5 text-xs text-slate2 tnum">
            {money0(goal.current)} <span className="opacity-60">of</span> {money0(goal.target)}
          </p>
        </>
      )}
    </div>
  );
}
