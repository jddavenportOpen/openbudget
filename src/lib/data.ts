/**
 * data.ts — server-side reads/writes against the budget_* tables.
 * All callers are gated by middleware (valid allowlisted session).
 */
import { getSupabaseAdmin } from "@/lib/supabase";
import type {
  Account, Envelope, Transaction, Todo, Goal, MonthRow, EnvelopeWithMath,
} from "@/lib/types";
import { envelopeMath, monthRange, monthTotals } from "@/lib/budget-math";

export function currentMonth(): string {
  return new Date().toISOString().slice(0, 7); // YYYY-MM
}

export async function getAccounts(): Promise<Account[]> {
  const sb = getSupabaseAdmin();
  const { data } = await sb
    .from("budget_accounts")
    .select("id,name,org,balance,currency,is_primary")
    .order("is_primary", { ascending: false })
    .order("name");
  return (data ?? []) as Account[];
}

export async function getEnvelopes(): Promise<Envelope[]> {
  const sb = getSupabaseAdmin();
  const { data } = await sb
    .from("budget_envelopes")
    .select("id,name,grp,monthly_allocated,sort_order")
    .order("sort_order");
  return (data ?? []) as Envelope[];
}

export async function getTransactions(opts?: {
  account?: string;
  month?: string;
  limit?: number;
}): Promise<Transaction[]> {
  const sb = getSupabaseAdmin();
  let q = sb
    .from("budget_transactions")
    .select("id,account_id,account,date,amount,description,payee,category,envelope_id,assigned,needs_review")
    .order("date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(opts?.limit ?? 500);
  // Optionally ignore transactions before a cutoff date (e.g. when you only want
  // to budget from the month you started). Set BUDGET_START_DATE=YYYY-MM-DD to
  // enable; unset means "track everything".
  const startDate = process.env.BUDGET_START_DATE;
  if (startDate) q = q.gte("date", startDate);
  if (opts?.account) q = q.eq("account", opts.account);
  if (opts?.month) {
    // "-31" is not a valid date in a 30-day month, and Postgres rejects it, so
    // bound the month by the first day of the next one instead.
    const { start, nextStart } = monthRange(opts.month);
    q = q.gte("date", start).lt("date", nextStart);
  }
  const { data } = await q;
  return (data ?? []) as Transaction[];
}

export async function getTodos(): Promise<Todo[]> {
  const sb = getSupabaseAdmin();
  const { data } = await sb
    .from("budget_todos")
    .select("id,title,detail,amount,status,sort_order")
    .order("status")
    .order("sort_order");
  return (data ?? []) as Todo[];
}

export async function getGoals(): Promise<Goal[]> {
  const sb = getSupabaseAdmin();
  const { data } = await sb
    .from("budget_goals")
    .select("id,title,detail,target,current,sort_order")
    .order("sort_order");
  return (data ?? []) as Goal[];
}

export async function getMonth(month: string): Promise<MonthRow> {
  const sb = getSupabaseAdmin();
  const { data } = await sb
    .from("budget_months")
    .select("month,available_to_budget")
    .eq("month", month)
    .limit(1);
  if (data && data.length) return data[0] as MonthRow;
  return { month, available_to_budget: 0 };
}

/** Envelopes annotated with this-month spent + remaining. */
export async function getEnvelopesWithMath(month: string): Promise<EnvelopeWithMath[]> {
  const [envelopes, txns] = await Promise.all([
    getEnvelopes(),
    getTransactions({ month, limit: 2000 }),
  ]);
  return envelopeMath(envelopes, txns);
}

/** Dashboard rollup for a month. */
export async function getDashboard(month: string) {
  const [accounts, envelopes, txns, goals, mrow] = await Promise.all([
    getAccounts(),
    getEnvelopesWithMath(month),
    getTransactions({ month, limit: 3000 }),
    getGoals(),
    getMonth(month),
  ]);

  const totals = monthTotals(mrow.available_to_budget, envelopes, txns);

  return {
    month,
    accounts,
    envelopes,
    goals,
    availableToBudget: mrow.available_to_budget,
    ...totals,
    txnCount: txns.length,
  };
}
