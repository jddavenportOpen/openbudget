#!/usr/bin/env node
/**
 * sync.mjs — OpenBudget SimpleFIN → Supabase sync.
 *
 * SimpleFIN Bridge gives you READ-ONLY access to your bank transactions for
 * ~$15/yr. This script pulls accounts + transactions and UPSERTs them into your
 * Supabase budget_* tables. It is idempotent on SimpleFIN's stable ids and it
 * NEVER clobbers your envelope assignments or review flags — on a transaction it
 * has already seen, it leaves your edits alone.
 *
 * No bank passwords are ever stored or transmitted. The only secret is the
 * SimpleFIN access URL (read-only), kept in the SIMPLEFIN_ACCESS_URL env var.
 *
 * Usage:
 *   # one-time: exchange your SimpleFIN setup token for a permanent access URL
 *   node scripts/sync.mjs claim <SETUP_TOKEN>
 *     -> prints the access URL. Save it as SIMPLEFIN_ACCESS_URL (env / Vercel).
 *
 *   # ongoing: pull recent transactions into Supabase
 *   node scripts/sync.mjs sync [--days 30]
 *
 * Required env for `sync`:
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SIMPLEFIN_ACCESS_URL
 *
 * Run it on a schedule (cron, GitHub Actions, a Vercel Cron, etc.) — e.g. a few
 * times a day. See SETUP.md.
 */
import { createClient } from "@supabase/supabase-js";

// --- generic keyword categorizer (extend to taste) ---
const CATEGORIES = {
  Groceries: ["grocery", "market", "supermarket", "whole foods", "trader joe", "costco", "aldi", "kroger", "safeway"],
  Dining: ["restaurant", "cafe", "coffee", "bar ", "grill", "pizza", "doordash", "uber eats", "grubhub"],
  Transport: ["gas", "fuel", "shell", "chevron", "exxon", "uber", "lyft", "transit", "parking"],
  Utilities: ["power", "electric", "water", "gas company", "internet", "comcast", "verizon", "at&t", "t-mobile"],
  Subscriptions: ["netflix", "spotify", "apple.com", "prime", "subscription", "membership"],
  Shopping: ["amazon", "target", "walmart", "store", "shop"],
  Health: ["pharmacy", "cvs", "walgreens", "clinic", "dental", "medical", "doctor"],
  Income: ["payroll", "deposit", "direct dep", "salary", "refund"],
};

function categorize(desc) {
  const d = (desc || "").toLowerCase();
  for (const [cat, kws] of Object.entries(CATEGORIES)) {
    if (kws.some((k) => d.includes(k))) return cat;
  }
  return "Uncategorized";
}

function fail(msg) {
  console.error(`\n✖ ${msg}\n`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// claim: setup token (base64 of a claim URL) -> permanent access URL
// ---------------------------------------------------------------------------
async function claim(setupToken) {
  if (!setupToken) fail("Usage: node scripts/sync.mjs claim <SETUP_TOKEN>");
  let claimUrl;
  try {
    claimUrl = Buffer.from(setupToken.trim(), "base64").toString("utf8");
  } catch {
    fail("Setup token is not valid base64. Copy it exactly from beta-bridge.simplefin.org.");
  }
  const res = await fetch(claimUrl, { method: "POST" });
  if (!res.ok) fail(`SimpleFIN claim failed: HTTP ${res.status} ${(await res.text()).slice(0, 200)}`);
  const accessUrl = (await res.text()).trim();
  console.log("\n✔ Claimed. Set this as your SIMPLEFIN_ACCESS_URL env var (keep it secret):\n");
  console.log(accessUrl + "\n");
}

// ---------------------------------------------------------------------------
// sync: pull from SimpleFIN, upsert into Supabase
// ---------------------------------------------------------------------------
async function sync(days = 30) {
  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  const ACCESS_URL = process.env.SIMPLEFIN_ACCESS_URL;
  if (!SUPABASE_URL || !SERVICE_KEY) fail("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  if (!ACCESS_URL) fail("Set SIMPLEFIN_ACCESS_URL (run `claim <SETUP_TOKEN>` first).");

  const sb = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const start = Math.floor((Date.now() - days * 86400 * 1000) / 1000);
  const url = `${ACCESS_URL.replace(/\/$/, "")}/accounts?start-date=${start}`;
  const res = await fetch(url);
  if (!res.ok) fail(`SimpleFIN accounts HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();

  const accounts = [];
  const txns = [];
  const primaryHint = (process.env.PRIMARY_CARD_HINT || "").toLowerCase();
  for (const acc of data.accounts || []) {
    const name = (acc.name || acc.org?.name || "Account")
      .split("")
      .filter((ch) => ch.charCodeAt(0) < 0x2500)
      .join("")
      .trim();
    accounts.push({
      id: acc.id,
      name,
      org: acc.org?.name ?? null,
      balance: acc.balance != null ? Number(acc.balance) : null,
      currency: acc.currency || "USD",
      is_primary: primaryHint ? name.toLowerCase().includes(primaryHint) : false,
      updated_at: new Date().toISOString(),
    });
    for (const t of acc.transactions || []) {
      const desc = t.description || t.payee || "";
      txns.push({
        id: t.id,
        account_id: acc.id,
        account: name,
        date: new Date(Number(t.posted) * 1000).toISOString().slice(0, 10),
        amount: Number(t.amount || 0),
        description: desc.slice(0, 200),
        payee: (t.payee || "").slice(0, 120),
        category: categorize(desc),
      });
    }
  }

  // Upsert accounts (bank fields refresh; merge on id).
  if (accounts.length) {
    const { error } = await sb.from("budget_accounts").upsert(accounts, { onConflict: "id" });
    if (error) fail(`upsert accounts: ${error.message}`);
  }

  // Insert ONLY new transactions so we never overwrite your envelope_id /
  // assigned / needs_review on rows you've already touched.
  const incoming = txns.filter((t) => t.id);
  const { data: existing, error: exErr } = await sb
    .from("budget_transactions")
    .select("id");
  if (exErr) fail(`read existing txns: ${exErr.message}`);
  const seen = new Set((existing || []).map((r) => r.id));
  const isFirstRun = seen.size === 0;
  const fresh = incoming.filter((t) => !seen.has(t.id));

  if (fresh.length) {
    const rows = fresh.map((t) => ({
      ...t,
      assigned: false,
      needs_review: false,
      // On the very first run, mark everything notified so a future
      // notification step (if you add one) doesn't blast your whole history.
      notified: isFirstRun,
    }));
    const { error } = await sb
      .from("budget_transactions")
      .upsert(rows, { onConflict: "id", ignoreDuplicates: true });
    if (error) fail(`insert transactions: ${error.message}`);
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        accounts: accounts.length,
        pulled: incoming.length,
        already_had: seen.size,
        new_inserted: fresh.length,
        first_run: isFirstRun,
      },
      null,
      2
    )
  );
}

// ---------------------------------------------------------------------------
const [cmd, ...rest] = process.argv.slice(2);
if (cmd === "claim") {
  await claim(rest[0]);
} else if (cmd === "sync" || !cmd) {
  let days = 30;
  const i = rest.indexOf("--days");
  if (i !== -1 && rest[i + 1]) days = parseInt(rest[i + 1], 10) || 30;
  await sync(days);
} else {
  console.log("Usage:\n  node scripts/sync.mjs claim <SETUP_TOKEN>\n  node scripts/sync.mjs sync [--days N]");
  process.exit(1);
}
