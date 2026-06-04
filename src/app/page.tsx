import Link from "next/link";
import { Wallet, AlertCircle, CreditCard, Target, ChevronRight } from "lucide-react";

import AppHeader from "@/components/AppHeader";
import BottomNav from "@/components/BottomNav";
import AvailableInput from "@/components/AvailableInput";
import GoalCard from "@/components/GoalCard";
import { getDashboard, currentMonth } from "@/lib/data";
import { currentEmail } from "@/lib/session";
import { money, money0, monthLabel } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const month = currentMonth();
  const [d, email] = await Promise.all([getDashboard(month), currentEmail()]);

  const tbb = d.toBeBudgeted;
  const tbbColor = tbb < 0 ? "text-red-600" : tbb === 0 ? "text-teal-700" : "text-teal-700";

  return (
    <main className="max-w-2xl mx-auto px-4 pb-28">
      <AppHeader title={monthLabel(month)} subtitle="Every dollar gets a job." email={email} />

      {/* To Be Budgeted hero */}
      <section className="card p-5 mt-1">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-slate2 font-semibold">To Be Budgeted</p>
            <p className={`text-4xl font-bold tnum mt-1 ${tbbColor}`}>{money(tbb)}</p>
          </div>
          <div className="text-right">
            <p className="text-[11px] text-slate2">Allocated</p>
            <p className="text-lg font-semibold tnum text-ink">{money0(d.totalAllocated)}</p>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-teal-900/10">
          <label className="text-xs uppercase tracking-wider text-slate2 font-semibold">
            This month&apos;s money to budget
          </label>
          <div className="mt-2">
            <AvailableInput month={month} initial={d.availableToBudget} />
          </div>
          <p className="mt-2 text-[11px] text-slate2 leading-relaxed">
            Type what&apos;s coming in this month. To Be Budgeted = this minus everything you&apos;ve
            allocated to envelopes.
          </p>
        </div>
      </section>

      {/* Spend vs budget + alerts */}
      <section className="grid grid-cols-2 gap-3 mt-3">
        <div className="card p-4">
          <div className="flex items-center gap-1.5 text-slate2">
            <Wallet size={13} strokeWidth={2.2} />
            <p className="text-[11px] uppercase tracking-wider font-semibold">Spent this month</p>
          </div>
          <p className="text-2xl font-bold tnum mt-1 text-ink">{money(d.spent)}</p>
          <p className="text-[11px] text-slate2 mt-0.5">{money0(d.income)} came in</p>
        </div>
        <Link href="/transactions?filter=unassigned" className="card p-4 active:scale-[0.99] transition-transform">
          <div className="flex items-center gap-1.5 text-slate2">
            <AlertCircle size={13} strokeWidth={2.2} />
            <p className="text-[11px] uppercase tracking-wider font-semibold">Needs an envelope</p>
          </div>
          <p className="text-2xl font-bold tnum mt-1 text-amber-600">{d.unassigned}</p>
          <p className="text-[11px] text-slate2 mt-0.5">
            {d.needsReview > 0 ? `${d.needsReview} flagged for review →` : "tap to assign →"}
          </p>
        </Link>
      </section>

      {/* Accounts — primary card highlighted, each row taps into that card's activity */}
      <section className="mt-5">
        <div className="flex items-center gap-2 mb-2 px-1">
          <h2 className="text-sm font-semibold text-ink/80">Accounts</h2>
          <span className="text-[11px] text-slate2">tap a card to see its spending</span>
        </div>
        <div className="card divide-y divide-teal-900/5">
          {d.accounts.filter((a) => !/saving/i.test(a.name)).map((a) => (
            <Link
              key={a.id}
              href={`/transactions?account=${encodeURIComponent(a.name)}`}
              className="flex items-center justify-between px-4 py-3 active:bg-teal-50/60 transition-colors"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <CreditCard
                  size={18}
                  strokeWidth={2}
                  className={a.is_primary ? "text-teal-700 shrink-0" : "text-slate2 shrink-0"}
                />
                {a.is_primary && <span className="pill bg-teal-700 text-white shrink-0">primary</span>}
                <span className={`text-sm truncate ${a.is_primary ? "font-semibold text-ink" : "text-slate2"}`}>
                  {a.name}
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span
                  className={`text-sm font-semibold tnum ${
                    (a.balance ?? 0) < 0 ? "text-red-600" : "text-ink"
                  }`}
                >
                  {money(a.balance)}
                </span>
                <ChevronRight size={16} className="text-slate2/50" />
              </div>
            </Link>
          ))}
        </div>
        <p className="mt-2 px-1 text-[11px] text-slate2">
          Tip: route everyday spending through one card so every charge lands here to assign.
        </p>
      </section>

      {/* Goals */}
      <section className="mt-6">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold text-ink/80 mb-2 px-1">
          <Target size={15} strokeWidth={2.2} className="text-teal-700" />
          Our goals
        </h2>
        <div className="grid gap-3">
          {d.goals.map((g) => (
            <GoalCard key={g.id} goal={g} />
          ))}
        </div>
      </section>

      {/* Ethos */}
      <section className="mt-6 card p-5 text-center bg-gradient-to-br from-teal-50 to-white">
        <p className="text-sm text-teal-900/80 italic leading-relaxed">
          &ldquo;A budget is telling your money where to go instead of wondering where it went.&rdquo;
        </p>
        <p className="mt-2 text-[11px] text-slate2">
          Live below your means. Give every dollar a job. Save together.
        </p>
      </section>

      <BottomNav />
    </main>
  );
}
