export interface Account {
  id: string;
  name: string;
  org: string | null;
  balance: number | null;
  currency: string;
  is_primary: boolean;
}

export interface Envelope {
  id: string;
  name: string;
  grp: string;
  monthly_allocated: number;
  sort_order: number;
}

export interface Transaction {
  id: string;
  account_id: string | null;
  account: string | null;
  date: string;
  amount: number;
  description: string | null;
  payee: string | null;
  category: string | null;
  envelope_id: string | null;
  assigned: boolean;
  needs_review: boolean;
}

export interface Todo {
  id: string;
  title: string;
  detail: string | null;
  amount: number | null;
  status: string;
  sort_order: number;
}

export interface Goal {
  id: string;
  title: string;
  detail: string | null;
  target: number | null;
  current: number;
  sort_order: number;
}

export interface MonthRow {
  month: string;
  available_to_budget: number;
}

/** Envelope with derived spent/remaining for the current month. */
export interface EnvelopeWithMath extends Envelope {
  spent: number;
  remaining: number;
}
