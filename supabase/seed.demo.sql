-- OpenBudget — OPTIONAL demo seed (obviously-fake data).
-- Run AFTER schema.sql if you want to see the UI populated before you connect a
-- real bank. Everything here is fictional. Delete these rows whenever you like:
--   delete from budget_transactions where id like 'DEMO-%';
--   delete from budget_accounts where id like 'DEMO-%';
--   delete from budget_envelopes where name like '[demo]%';
--   delete from budget_goals where title like '[demo]%';
--   delete from budget_todos where title like '[demo]%';

-- Fake accounts
insert into budget_accounts (id, name, org, balance, currency, is_primary) values
  ('DEMO-CHECKING', 'Everyday Checking', 'Demo Bank', 2840.00, 'USD', true),
  ('DEMO-SAVINGS',  'Rainy Day Savings', 'Demo Bank', 6120.00, 'USD', false)
on conflict (id) do nothing;

-- Envelopes
insert into budget_envelopes (name, grp, monthly_allocated, sort_order) values
  ('[demo] Rent / Housing', 'Fixed',         1200, 1),
  ('[demo] Groceries',      'Variable',        500, 2),
  ('[demo] Dining Out',     'Discretionary',   150, 3),
  ('[demo] Savings',        'Savings',         400, 4)
on conflict (name) do nothing;

-- A couple of fake transactions, assigned to demo envelopes by name lookup
insert into budget_transactions (id, account_id, account, date, amount, description, payee, category, assigned, envelope_id)
select 'DEMO-TXN-1', 'DEMO-CHECKING', 'Everyday Checking', current_date - 3, -54.20,
       'CORNER GROCERY #42', 'Corner Grocery', 'Groceries', true,
       (select id from budget_envelopes where name = '[demo] Groceries')
where not exists (select 1 from budget_transactions where id = 'DEMO-TXN-1');

insert into budget_transactions (id, account_id, account, date, amount, description, payee, category, assigned, envelope_id)
select 'DEMO-TXN-2', 'DEMO-CHECKING', 'Everyday Checking', current_date - 1, -18.75,
       'NOODLE HOUSE', 'Noodle House', 'Dining', true,
       (select id from budget_envelopes where name = '[demo] Dining Out')
where not exists (select 1 from budget_transactions where id = 'DEMO-TXN-2');

insert into budget_transactions (id, account_id, account, date, amount, description, payee, category, assigned)
select 'DEMO-TXN-3', 'DEMO-CHECKING', 'Everyday Checking', current_date - 5, 2500.00,
       'PAYROLL DEPOSIT', 'Acme Co', 'Income', false
where not exists (select 1 from budget_transactions where id = 'DEMO-TXN-3');

-- This month's available-to-budget
insert into budget_months (month, available_to_budget)
values (to_char(current_date, 'YYYY-MM'), 2500)
on conflict (month) do nothing;

-- A demo goal + to-do
insert into budget_goals (title, detail, target, current, sort_order)
select '[demo] Build a $1,000 emergency fund', 'Small starter cushion.', 1000, 250, 1
where not exists (select 1 from budget_goals where title = '[demo] Build a $1,000 emergency fund');

insert into budget_todos (title, detail, amount, status, sort_order)
select '[demo] Cancel unused subscription', 'You spotted a charge you forgot about.', 12, 'open', 1
where not exists (select 1 from budget_todos where title = '[demo] Cancel unused subscription');
