# OpenBudget — Setup

A single, linear path from zero to a working budget. No choices to make — just do each step in order. Total time: ~20–30 minutes.

You'll create three free/cheap accounts (SimpleFIN ~$15/yr, Supabase free, Resend free, Vercel free), wire them together, and deploy.

---

## Step 1 — Get a SimpleFIN bank connection (~$15/yr)

SimpleFIN Bridge is what reads your bank transactions. It's **read-only** — it cannot move money.

1. Go to **https://beta-bridge.simplefin.org/** and create an account (the subscription is about $15/year).
2. Click **Connect** and link your bank(s). Authorize the accounts you want to budget.
3. When done, generate a **Setup Token**. It's a long base64 string. Copy it — you'll exchange it for a permanent access URL in Step 5.

> Keep the setup token private. It's one-time-use: you'll trade it for an access URL.

---

## Step 2 — Create a free Supabase project and load the schema

Supabase is your database. It's where your budget lives — in *your* account, not anyone else's.

1. Go to **https://supabase.com**, sign in, and click **New project**. Pick any name, set a database password, choose a region near you. Wait ~2 minutes for it to provision.
2. In the left sidebar, open **SQL Editor → New query**.
3. Open [`supabase/schema.sql`](./supabase/schema.sql) from this repo, copy its entire contents, paste into the editor, and click **Run**. You should see "Success."
4. *(Optional)* To see the UI populated with obviously-fake demo data before you connect a bank, also run [`supabase/seed.demo.sql`](./supabase/seed.demo.sql). You can delete those rows later (instructions are at the top of that file).
5. Go to **Settings → API**. You'll need two values in Step 4:
   - **Project URL** → `SUPABASE_URL`
   - **service_role** secret key (under "Project API keys") → `SUPABASE_SERVICE_ROLE_KEY`

> The `service_role` key is powerful and secret. Treat it like a password. It's only ever used server-side.

---

## Step 3 — Get a Resend API key (for login emails)

OpenBudget signs you in with magic links, sent via Resend.

1. Go to **https://resend.com**, sign up (free tier is plenty).
2. Create an **API Key** → copy it. That's `RESEND_API_KEY`.
3. **From address:**
   - **Fastest path:** use `onboarding@resend.dev` as `MAGIC_FROM_EMAIL`. Resend's sandbox only delivers to the email you signed up with — fine if that's on your allowlist.
   - **Proper path:** in Resend, **Add a Domain** you own and verify it (add the DNS records they give you). Then set `MAGIC_FROM_EMAIL` to something like `login@yourdomain.com`, which can email anyone.

---

## Step 4 — Fill in your environment variables

1. Copy the template:
   ```bash
   cp .env.example .env.local
   ```
2. Generate a session secret:
   ```bash
   openssl rand -hex 32   # use for SESSION_SECRET
   ```
3. Edit `.env.local` and set:
   - `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (from Step 2)
   - `ALLOWED_EMAILS` — comma-separated list of who can log in (e.g. `you@example.com,partner@example.com`). **If this is empty, nobody can sign in.**
   - `SESSION_SECRET` (the `openssl` output)
   - `RESEND_API_KEY` and `MAGIC_FROM_EMAIL` (from Step 3)

Leave `SIMPLEFIN_ACCESS_URL` blank for now — you'll fill it in Step 5.

---

## Step 5 — Connect SimpleFIN to your database

1. Install dependencies and exchange your setup token for a permanent access URL:
   ```bash
   npm install
   npm run sync -- claim <PASTE_YOUR_SETUP_TOKEN>
   ```
2. It prints an **access URL**. Copy it and set it as `SIMPLEFIN_ACCESS_URL` in `.env.local`.
3. Do the first sync (this pulls your recent transactions into Supabase):
   ```bash
   npm run sync
   ```
   You'll see a JSON summary (accounts, transactions inserted, etc.).

> **Keep this running automatically.** Schedule `npm run sync` to run a few times a day — via cron on a machine that's always on, a GitHub Actions scheduled workflow, or a Vercel Cron job hitting a small route you add. The web app does **not** need `SIMPLEFIN_ACCESS_URL`; only the sync does.

---

## Step 6 — Deploy to Vercel

1. Push this repo to your own GitHub (or use the **Deploy with Vercel** button in the [README](./README.md), which clones it for you).
2. In Vercel, import the project. When prompted for **Environment Variables**, add the same values from your `.env.local`:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `ALLOWED_EMAILS`
   - `SESSION_SECRET`
   - `RESEND_API_KEY`
   - `MAGIC_FROM_EMAIL`
   - `NEXT_PUBLIC_SITE_URL` — set this to your Vercel URL once you know it (e.g. `https://your-app.vercel.app`)
3. Deploy. When it's live, visit **`/setup`** on your URL to confirm every required variable is green.
4. Go to **`/login`**, enter an allowlisted email, click the magic link, and you're in.

---

## You're done

- Set your envelopes and what's coming in this month; allocate until **To Be Budgeted** is zero.
- As the sync runs, new charges show up under **Transactions** to assign.

### Troubleshooting

- **Magic link never arrives:** check `RESEND_API_KEY` and that your `MAGIC_FROM_EMAIL` domain is verified (or that you're emailing the address you signed up to Resend with). For local testing set `BUDGET_DEV_MAGIC_LINK=true` and the link comes back in the API response.
- **No transactions:** make sure you ran `npm run sync` and that `SIMPLEFIN_ACCESS_URL` is set where you run it. Add `--days 90` to backfill more history: `npm run sync -- sync --days 90`.
- **Can't sign in:** confirm your email is in `ALLOWED_EMAILS` (comma-separated, no spaces issues) and redeploy after changing it.
