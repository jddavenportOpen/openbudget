/**
 * data.ts — server-side reads/writes against the budget_* tables.
 * All callers are gated by middleware (valid allowlisted session).
 */
import { getSupabaseAdmin } from "@/lib/supabase";
import type {
  Account, Envelope, Transaction, Todo, Goal, MonthRow, EnvelopeWithMath,
} from "@/lib/types";

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
    q = q.gte("date", `${opts.month}-01`).lte("date", `${opts.month}-31`);
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
  const spentByEnv = new Map<string, number>();
  for (const t of txns) {
    if (!t.envelope_id) continue;
    if (t.amount >= 0) continue; // only spending counts against an envelope
    spentByEnv.set(t.envelope_id, (spentByEnv.get(t.envelope_id) ?? 0) + Math.abs(t.amount));
  }
  return envelopes.map((e) => {
    const spent = spentByEnv.get(e.id) ?? 0;
    return { ...e, spent, remaining: e.monthly_allocated - spent };
  });
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

  const totalAllocated = envelopes.reduce((s, e) => s + e.monthly_allocated, 0);
  const spent = txns.filter((t) => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
  const income = txns.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const toBeBudgeted = mrow.available_to_budget - totalAllocated;
  const unassigned = txns.filter((t) => t.amount < 0 && !t.envelope_id).length;
  const needsReview = txns.filter((t) => t.needs_review).length;

  return {
    month,
    accounts,
    envelopes,
    goals,
    availableToBudget: mrow.available_to_budget,
    totalAllocated,
    toBeBudgeted,
    spent,
    income,
    unassigned,
    needsReview,
    txnCount: txns.length,
  };
}
