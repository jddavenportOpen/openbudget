# OpenBudget

**A self-hosted, open-source budgeting app. Replace your ~$109/yr YNAB subscription with a ~$15/yr read-only bank API key — and own all your data.**

OpenBudget is envelope-style ("every dollar gets a job") budgeting that syncs your real bank transactions automatically via [SimpleFIN Bridge](https://beta-bridge.simplefin.org/) (read-only, ~$15/yr). It runs on a free Supabase database and deploys to Vercel's free tier. Sign-in is passwordless magic links, locked to an email allowlist you control. There's also an optional AES-256-GCM encrypted vault for storing your own bank logins as private reference.

> This is a productized fork of the private budgeting app I built for my own household. I stripped everything personal and gave the whole thing away. Bring your own keys; your data lives in *your* Supabase project, not mine.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FJDDavenport%2Fopenbudget&env=SUPABASE_URL,SUPABASE_SERVICE_ROLE_KEY,ALLOWED_EMAILS,SESSION_SECRET,RESEND_API_KEY,MAGIC_FROM_EMAIL,BUDGET_VAULT_KEY&envDescription=Supabase%20keys%2C%20your%20allowed%20emails%2C%20a%20session%20secret%2C%20Resend%20for%20login%20emails%2C%20and%20a%20vault%20key.%20See%20SETUP.md.&envLink=https%3A%2F%2Fgithub.com%2FJDDavenport%2Fopenbudget%2Fblob%2Fmain%2FSETUP.md&project-name=openbudget&repository-name=openbudget)

---

## Why

YNAB is great, but it's ~$109/year and your financial data lives on their servers. OpenBudget gives you the core of that workflow — automatic bank sync, envelope budgeting, "to be budgeted," spending review — for the price of a SimpleFIN subscription (~$15/yr), entirely self-hosted, with the data in a database you own.

| | YNAB | OpenBudget |
|---|---|---|
| Cost | ~$109/yr | ~$15/yr (SimpleFIN) + free tiers |
| Bank sync | Yes | Yes (SimpleFIN, read-only) |
| Your data | Their cloud | Your Supabase project |
| Source | Closed | MIT, this repo |

## Features

- **Automatic bank sync** via SimpleFIN Bridge — read-only, no bank passwords ever stored.
- **Envelope budgeting** — give every dollar a job; see spent vs. remaining per envelope, per month.
- **"To Be Budgeted"** — set what's coming in, allocate it, watch the number hit zero.
- **Transaction review** — new charges land unassigned; tap to drop them in an envelope or flag for review.
- **Savings goals & financial to-dos** — track progress toward targets and one-off money tasks.
- **Encrypted credential vault** *(optional)* — keep your own bank logins as AES-256-GCM encrypted private reference. The app never uses them to automate anything — that's what the read-only SimpleFIN connection is for.
- **Passwordless auth** — magic-link sign-in, locked to an email allowlist you set. Fails closed.
- **Mobile-first UI** — built for your phone, works everywhere.

## Screenshot

> _Add a screenshot here after your first deploy (drop a `public/screenshot.png` and reference it)._

## How it works

- **Bank data** comes only from **SimpleFIN Bridge** (`scripts/sync.mjs`). You connect your banks at SimpleFIN, get a read-only access URL, and a scheduled job pulls transactions into your Supabase `budget_*` tables. SimpleFIN credentials are read-only and scoped to the accounts you authorize.
- **The web app** (Next.js 15, App Router) reads/writes those tables server-side using your Supabase service-role key. The browser never holds a database key.
- **Auth** is a magic-link flow (ported pattern, Web Crypto only): a single-use token (15 min) is emailed via Resend; the session is a stateless HMAC-signed cookie. Every request is gated by `middleware.ts` against your `ALLOWED_EMAILS`.
- **The vault** encrypts secrets with `BUDGET_VAULT_KEY` (AES-256-GCM) *before* they touch the database. The key lives only in your environment, never in the DB. Decryption happens transiently, server-side, for an authenticated session, and plaintext is never logged.

## Quick start

The full, no-branches walkthrough is in **[SETUP.md](./SETUP.md)**. In short:

1. **SimpleFIN** — sign up at [beta-bridge.simplefin.org](https://beta-bridge.simplefin.org/) (~$15/yr), connect your bank(s), get a **setup token**.
2. **Supabase** — create a free project, run [`supabase/schema.sql`](./supabase/schema.sql) in the SQL editor.
3. **Configure** — copy [`.env.example`](./.env.example), fill in your keys, set `ALLOWED_EMAILS`, and generate a `SESSION_SECRET` + `BUDGET_VAULT_KEY` with `openssl rand -hex 32`.
4. **Deploy** — click the **Deploy with Vercel** button above (or `vercel deploy`), pasting those env vars.
5. **Sync** — run `npm run sync -- claim <SETUP_TOKEN>`, save the printed access URL as `SIMPLEFIN_ACCESS_URL`, then `npm run sync` (and schedule it).

Visit `/setup` on your deployment any time to see which environment variables are still missing.

## Local development

```bash
npm install
cp .env.example .env.local   # fill in your values
npm run dev                  # http://localhost:3000
```

For local sign-in before your email domain is verified in Resend, set `BUDGET_DEV_MAGIC_LINK=true` — the login response will include the magic link directly.

## Security notes

- **The vault is AES-256-GCM.** Secrets are encrypted with `BUDGET_VAULT_KEY` before being stored. The key never enters the database. If you lose the key, the ciphertext is unrecoverable (by design).
- **No bank passwords are transmitted to OpenBudget.** Transaction data comes only through SimpleFIN's read-only access URL.
- **The allowlist fails closed.** If `ALLOWED_EMAILS` is empty, nobody can sign in.
- **The Supabase service-role key is server-only.** It is never shipped to the browser. The schema enables Row Level Security with no permissive public policies as a second layer of defense.
- **Rotate your keys** if you ever suspect exposure, and never commit a real `.env`.

## Tech stack

Next.js 15 · React 19 · TypeScript · Tailwind CSS · Supabase (Postgres) · SimpleFIN Bridge · Resend · Vercel.

## License

[MIT](./LICENSE) © 2026 JD Davenport. This started as my family's private budgeting app and was productized for anyone to self-host.
