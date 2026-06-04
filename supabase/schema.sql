-- OpenBudget — fresh database schema.
-- Run this ONCE in the Supabase SQL Editor (Dashboard → SQL → New query → paste → Run)
-- on a brand-new project. It creates every table the app and the sync script use.
--
-- Security model: the app talks to Supabase ONLY from the server, using the
-- service-role key, behind a magic-link allowlist gate (see ALLOWED_EMAILS).
-- Row Level Security is therefore enabled and locked to "deny all" for the
-- anon/public roles — no browser ever holds a Supabase key. The service-role
-- key bypasses RLS by design, which is exactly what the server route handlers use.

-- Needed for gen_random_uuid()
create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Bank accounts (synced from SimpleFIN; id is the stable SimpleFIN account id)
-- ---------------------------------------------------------------------------
create table if not exists budget_accounts (
  id          text primary key,            -- SimpleFIN account id (e.g. "ACT-...")
  name        text not null,
  org         text,
  balance     numeric,
  currency    text not null default 'USD',
  is_primary  boolean not null default false,
  updated_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Envelopes (your budget categories)
-- ---------------------------------------------------------------------------
create table if not exists budget_envelopes (
  id                uuid primary key default gen_random_uuid(),
  name              text not null unique,
  grp               text not null default 'Variable',  -- Fixed | Variable | Discretionary | Savings
  monthly_allocated numeric not null default 0,
  sort_order        integer not null default 0,
  created_at        timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Transactions (synced from SimpleFIN; id is the stable SimpleFIN txn id)
-- ---------------------------------------------------------------------------
create table if not exists budget_transactions (
  id            text primary key,           -- SimpleFIN transaction id (e.g. "TRN-...")
  account_id    text references budget_accounts(id) on delete set null,
  account       text,                       -- denormalized account name for display/filter
  date          date not null,
  amount        numeric not null,           -- negative = spend, positive = income
  description   text,
  payee         text,
  category      text,                       -- keyword auto-categorization from sync
  envelope_id   uuid references budget_envelopes(id) on delete set null,
  assigned      boolean not null default false,
  needs_review  boolean not null default false,
  notified      boolean not null default false,  -- sync sets true after notifying about a new charge
  created_at    timestamptz not null default now()
);
create index if not exists budget_transactions_date_idx on budget_transactions (date desc);
create index if not exists budget_transactions_envelope_idx on budget_transactions (envelope_id);

-- ---------------------------------------------------------------------------
-- Per-month "available to budget" input
-- ---------------------------------------------------------------------------
create table if not exists budget_months (
  month               text primary key,     -- "YYYY-MM"
  available_to_budget numeric not null default 0,
  updated_at          timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Savings / payoff goals
-- ---------------------------------------------------------------------------
create table if not exists budget_goals (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  detail      text,
  target      numeric,
  current     numeric not null default 0,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Financial to-dos
-- ---------------------------------------------------------------------------
create table if not exists budget_todos (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  detail      text,
  amount      numeric,
  status      text not null default 'open',  -- open | done
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Encrypted bank-login reference vault.
-- `secret` is AES-256-GCM ciphertext ("iv:tag:ct", all base64) produced by the
-- app using BUDGET_VAULT_KEY. The key NEVER lives in this database — only the
-- ciphertext does. Plaintext exists only transiently, server-side, on reveal.
-- ---------------------------------------------------------------------------
create table if not exists budget_vault (
  id          uuid primary key default gen_random_uuid(),
  bank_name   text not null,
  username    text not null default '',
  secret      text not null default '',     -- AES-256-GCM ciphertext, or '' if unset
  notes       text not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Single-use magic-link tokens (15-min, hashed). Raw token only lives in email.
-- ---------------------------------------------------------------------------
create table if not exists magic_tokens (
  token_hash  text primary key,             -- sha256(raw token)
  email       text not null,
  expires_at  timestamptz not null,
  used        boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists magic_tokens_email_idx on magic_tokens (email);

-- ---------------------------------------------------------------------------
-- Lock everything down for the anon/public roles. The app only ever connects
-- with the service-role key (server-side), which bypasses RLS. With RLS enabled
-- and NO permissive policies, the public anon key can read/write nothing — even
-- if it leaked. This is the belt-and-suspenders default.
-- ---------------------------------------------------------------------------
alter table budget_accounts     enable row level security;
alter table budget_envelopes    enable row level security;
alter table budget_transactions enable row level security;
alter table budget_months       enable row level security;
alter table budget_goals        enable row level security;
alter table budget_todos        enable row level security;
alter table budget_vault        enable row level security;
alter table magic_tokens        enable row level security;
