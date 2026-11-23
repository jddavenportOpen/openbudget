# OpenBudget

Envelope budgeting you host yourself. It pulls read-only bank transactions from SimpleFIN into a Supabase project you own, so your budget lives in a database only you control.

I wanted YNAB's workflow without paying ~$109 a year for it or handing my bank data to another company. SimpleFIN costs about $15 a year, and Supabase and Vercel have free tiers that cover one household.

Moved here from my private working repo in July 2026. Most of this code was written by Claude Code agents I run. I picked what got built. The private version runs my family's budget.

> This is a productized fork of the private budgeting app I built for my own household. I stripped everything personal and gave the whole thing away. Bring your own keys; your data lives in *your* Supabase project, not mine.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FjddavenportOpen%2Fopenbudget&env=SUPABASE_URL,SUPABASE_SERVICE_ROLE_KEY,ALLOWED_EMAILS,SESSION_SECRET,RESEND_API_KEY,MAGIC_FROM_EMAIL&envDescription=Supabase%20keys%2C%20your%20allowed%20emails%2C%20a%20session%20secret%2C%20and%20Resend%20for%20login%20emails.%20See%20SETUP.md.&envLink=https%3A%2F%2Fgithub.com%2FjddavenportOpen%2Fopenbudget%2Fblob%2Fmain%2FSETUP.md&project-name=openbudget&repository-name=openbudget)

---

## Compared with YNAB

OpenBudget gives you the core of YNAB's workflow (automatic bank sync, envelope budgeting, "to be budgeted", spending review) for the price of a SimpleFIN subscription (~$15/yr), entirely self-hosted, with the data in a database you own.

| | YNAB | OpenBudget |
|---|---|---|
| Cost | ~$109/yr | ~$15/yr (SimpleFIN) + free tiers |
| Bank sync | Yes | Yes (SimpleFIN, read-only) |
| Your data | Their cloud | Your Supabase project |
| Source | Closed | MIT, this repo |

## Features

- **Automatic bank sync** via SimpleFIN Bridge. Read-only, and no bank passwords are ever stored.
- **Envelope budgeting**: give every dollar a job; see spent vs. remaining per envelope, per month.
- **"To Be Budgeted"**: set what's coming in, allocate it, watch the number hit zero.
- **Transaction review**: new charges land unassigned; tap to drop them in an envelope or flag for review.
- **Savings goals & financial to-dos**: track progress toward targets and one-off money tasks.
- **Passwordless auth**: magic-link sign-in, locked to an email allowlist you set. Fails closed.
- **Mobile-first UI**: built for your phone, works everywhere.

## How it works

- **Bank data** comes only from **SimpleFIN Bridge** (`scripts/sync.mjs`). You connect your banks at SimpleFIN, get a read-only access URL, and a scheduled job pulls transactions into your Supabase `budget_*` tables. SimpleFIN credentials are read-only and scoped to the accounts you authorize.
- **The web app** (Next.js 15, App Router) reads and writes those tables server-side using your Supabase service-role key. The browser never holds a database key.
- **Auth** is a magic-link flow (ported pattern, Web Crypto only): a single-use token (15 min) is emailed via Resend; the session is a stateless HMAC-signed cookie. Every request is gated by `middleware.ts` against your `ALLOWED_EMAILS`.

## Quick start

The full, no-branches walkthrough is in **[SETUP.md](./SETUP.md)**. In short:

1. **SimpleFIN**: sign up at [beta-bridge.simplefin.org](https://beta-bridge.simplefin.org/) (~$15/yr), connect your bank(s), get a **setup token**.
2. **Supabase**: create a free project, run [`supabase/schema.sql`](./supabase/schema.sql) in the SQL editor.
3. **Configure**: copy [`.env.example`](./.env.example), fill in your keys, set `ALLOWED_EMAILS`, and generate a `SESSION_SECRET` with `openssl rand -hex 32`.
4. **Deploy**: click the **Deploy with Vercel** button above (or `vercel deploy`), pasting those env vars.
5. **Sync**: run `npm run sync -- claim <SETUP_TOKEN>`, save the printed access URL as `SIMPLEFIN_ACCESS_URL`, then `npm run sync` (and schedule it).

Visit `/setup` on your deployment any time to see which environment variables are still missing.

## Local development

```bash
npm install
cp .env.example .env.local   # fill in your values
npm run dev                  # http://localhost:3000
npm test                     # the envelope math tests, no database needed
```

For local sign-in before your email domain is verified in Resend, set `BUDGET_DEV_MAGIC_LINK=true`. The login response will include the magic link directly.

## Security notes

- **No bank passwords are ever stored or transmitted to OpenBudget.** Transaction data comes only through SimpleFIN's read-only access URL. The app never sees your bank login.
- **The allowlist fails closed.** If `ALLOWED_EMAILS` is empty, nobody can sign in.
- **The Supabase service-role key is server-only.** It is never shipped to the browser. The schema enables Row Level Security with no permissive public policies as a second layer of defense.
- **Rotate your keys** if you ever suspect exposure, and never commit a real `.env`.

## Tech stack

Next.js 15 · React 19 · TypeScript · Tailwind CSS · Supabase (Postgres) · SimpleFIN Bridge · Resend · Vercel.

## License

[MIT](./LICENSE) © 2026 JD Davenport. This started as my family's private budgeting app and was productized for anyone to self-host.
