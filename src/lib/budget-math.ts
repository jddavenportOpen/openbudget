/**
 * budget-math.ts: the envelope math, kept free of database calls so it can be
 * tested on its own. Import types only here.
 */
import type { Envelope, EnvelopeWithMath, Transaction } from "./types";

/** First day of a "YYYY-MM" month, and the first day of the month after it. */
export function monthRange(month: string): { start: string; nextStart: string } {
  const [y, m] = month.split("-").map(Number);
  const ny = m === 12 ? y + 1 : y;
  const nm = m === 12 ? 1 : m + 1;
  const pad = (n: number) => String(n).padStart(2, "0");
  return { start: `${y}-${pad(m)}-01`, nextStart: `${ny}-${pad(nm)}-01` };
}

/** Spent and remaining per envelope. Only spending (negative amounts) counts. */
export function envelopeMath(envelopes: Envelope[], txns: Transaction[]): EnvelopeWithMath[] {
  const spentByEnv = new Map<string, number>();
  for (const t of txns) {
    if (!t.envelope_id) continue;
    if (t.amount >= 0) continue;
    spentByEnv.set(t.envelope_id, (spentByEnv.get(t.envelope_id) ?? 0) + Math.abs(t.amount));
  }
  return envelopes.map((e) => {
    const spent = spentByEnv.get(e.id) ?? 0;
    return { ...e, spent, remaining: e.monthly_allocated - spent };
  });
}

/** The month's totals: what's left to budget, money in and out, and what needs a look. */
export function monthTotals(
  availableToBudget: number,
  envelopes: Envelope[],
  txns: Transaction[],
) {
  const totalAllocated = envelopes.reduce((s, e) => s + e.monthly_allocated, 0);
  const spent = txns.filter((t) => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
  const income = txns.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  return {
    totalAllocated,
    toBeBudgeted: availableToBudget - totalAllocated,
    spent,
    income,
    unassigned: txns.filter((t) => t.amount < 0 && !t.envelope_id).length,
    needsReview: txns.filter((t) => t.needs_review).length,
  };
}
