/**
 * vault.ts — manual bank-login reference vault. NODE RUNTIME ONLY.
 *
 * SCOPE (deliberately narrow): this is a private, encrypted note so you (and
 * anyone you allowlist) can record logins for YOUR OWN banks. The app NEVER uses
 * these credentials to automate anything — no scraping, no OCR, no SSH, no
 * import. Bank *data* comes only via SimpleFIN (read-only). This vault is pure
 * human-typed reference.
 *
 * Storage: secret is AES-256-GCM ciphertext (base64 "iv:tag:ct") encrypted with
 * BUDGET_VAULT_KEY (32-byte key, env on the host — NEVER in the DB). Plaintext is
 * decrypted only server-side for an authenticated, allowlisted session, and is
 * NEVER logged. If BUDGET_VAULT_KEY is unset, the vault is read-only/locked.
 */
import crypto from "node:crypto";

import { getSupabaseAdmin } from "@/lib/supabase";

function keyBuf(): Buffer | null {
  const raw = process.env.BUDGET_VAULT_KEY || "";
  if (!raw) return null;
  // Accept hex (64 chars), base64, or a passphrase (hashed to 32 bytes).
  if (/^[0-9a-fA-F]{64}$/.test(raw)) return Buffer.from(raw, "hex");
  const b64 = Buffer.from(raw, "base64");
  if (b64.length === 32) return b64;
  return crypto.createHash("sha256").update(raw).digest();
}

export function vaultEnabled(): boolean {
  return keyBuf() !== null;
}

export function encryptSecret(plain: string): string {
  const key = keyBuf();
  if (!key) throw new Error("BUDGET_VAULT_KEY not set");
  if (!plain) return "";
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}:${tag.toString("base64")}:${ct.toString("base64")}`;
}

export function decryptSecret(blob: string): string {
  const key = keyBuf();
  if (!key) throw new Error("BUDGET_VAULT_KEY not set");
  if (!blob) return "";
  const [ivB, tagB, ctB] = blob.split(":");
  if (!ivB || !tagB || !ctB) return "";
  try {
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(ivB, "base64"));
    decipher.setAuthTag(Buffer.from(tagB, "base64"));
    const pt = Buffer.concat([decipher.update(Buffer.from(ctB, "base64")), decipher.final()]);
    return pt.toString("utf8");
  } catch {
    return ""; // wrong key / tampered — fail closed, never throw plaintext-y errors
  }
}

export interface VaultEntry {
  id: string;
  bank_name: string;
  username: string;
  has_secret: boolean;
  notes: string;
}

/** List vault entries WITHOUT decrypting secrets (just presence flag). */
export async function listVault(): Promise<VaultEntry[]> {
  const sb = getSupabaseAdmin();
  const { data } = await sb
    .from("budget_vault")
    .select("id,bank_name,username,secret,notes")
    .order("bank_name");
  return (data ?? []).map((r: { id: string; bank_name: string; username: string; secret: string; notes: string }) => ({
    id: r.id,
    bank_name: r.bank_name,
    username: r.username,
    has_secret: !!r.secret,
    notes: r.notes || "",
  }));
}

/** Reveal a single secret (decrypted) — only call from an authed handler. */
export async function revealSecret(id: string): Promise<string> {
  const sb = getSupabaseAdmin();
  const { data } = await sb.from("budget_vault").select("secret").eq("id", id).limit(1);
  if (!data || !data.length) return "";
  return decryptSecret((data[0] as { secret: string }).secret);
}

export async function updateVaultEntry(
  id: string,
  fields: { username?: string; password?: string; notes?: string }
): Promise<void> {
  const sb = getSupabaseAdmin();
  const patch: Record<string, string> = { updated_at: new Date().toISOString() };
  if (fields.username !== undefined) patch.username = fields.username;
  if (fields.notes !== undefined) patch.notes = fields.notes;
  if (fields.password !== undefined) {
    patch.secret = fields.password ? encryptSecret(fields.password) : "";
  }
  await sb.from("budget_vault").update(patch).eq("id", id);
}

/** Create a new vault entry (bank name required; password encrypted at rest). */
export async function createVaultEntry(fields: {
  bank_name: string;
  username?: string;
  password?: string;
  notes?: string;
}): Promise<string | null> {
  const sb = getSupabaseAdmin();
  const row: Record<string, string> = {
    bank_name: fields.bank_name.trim(),
    username: fields.username ?? "",
    notes: fields.notes ?? "",
    secret: fields.password ? encryptSecret(fields.password) : "",
  };
  const { data } = await sb.from("budget_vault").insert(row).select("id").limit(1);
  return data?.[0]?.id ?? null;
}

/** Delete a vault entry. */
export async function deleteVaultEntry(id: string): Promise<void> {
  const sb = getSupabaseAdmin();
  await sb.from("budget_vault").delete().eq("id", id);
}
