import AppHeader from "@/components/AppHeader";
import BottomNav from "@/components/BottomNav";
import BudgetManager from "@/components/BudgetManager";
import { getEnvelopesWithMath, getMonth, currentMonth } from "@/lib/data";
import { currentEmail } from "@/lib/session";
import { monthLabel } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function BudgetPage() {
  const month = currentMonth();
  const [envelopes, mrow, email] = await Promise.all([
    getEnvelopesWithMath(month),
    getMonth(month),
    currentEmail(),
  ]);

  return (
    <main className="max-w-2xl mx-auto px-4 pb-28">
      <AppHeader
        title="Budget"
        subtitle={`${monthLabel(month)} · give every dollar a job`}
        email={email}
      />
      <BudgetManager initial={envelopes} availableToBudget={mrow.available_to_budget} />
      <BottomNav />
    </main>
  );
}
