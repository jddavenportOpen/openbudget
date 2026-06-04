/**
 * auth.ts — magic-link allowlist + stateless signed session tokens.
 * Web Crypto API only, so it runs in BOTH the Edge middleware runtime AND Node
 * route handlers.
 *
 * The allowlist is the single security gate, enforced at request, verify, AND
 * middleware. It is driven entirely by the ALLOWED_EMAILS env var (a
 * comma-separated list). It fails CLOSED: if ALLOWED_EMAILS is empty, NO ONE can
 * sign in. Set it to your own household's emails on deploy.
 */

export const SESSION_COOKIE = "ob_session";
const SESSION_TTL_SECONDS = 180 * 24 * 60 * 60; // 180 days

export function normalizeEmail(email: string): string {
  return (email || "").trim().toLowerCase();
}

export function allowedEmails(): string[] {
  // ALLOWED_EMAILS is the canonical var; BUDGET_ALLOWED_EMAILS kept as an alias.
  const raw = (process.env.ALLOWED_EMAILS || process.env.BUDGET_ALLOWED_EMAILS || "").trim();
  if (!raw) return []; // fail closed — no env, no access
  return raw.split(",").map((e) => normalizeEmail(e)).filter(Boolean);
}

export function isAllowed(email: string): boolean {
  const e = normalizeEmail(email);
  if (!e) return false;
  return allowedEmails().includes(e);
}

// --- base64url helpers (Edge + Node safe) ---
function b64urlEncode(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function b64urlDecode(s: string): Uint8Array {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  const pad = b64.length % 4 ? "=".repeat(4 - (b64.length % 4)) : "";
  const bin = atob(b64 + pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
function utf8(s: string): Uint8Array<ArrayBuffer> {
  const enc = new TextEncoder().encode(s);
  const buf = new ArrayBuffer(enc.byteLength);
  const view = new Uint8Array(buf);
  view.set(enc);
  return view;
}

// --- HMAC-SHA256 via Web Crypto ---
function sessionSecret(): string {
  return (
    process.env.SESSION_SECRET ||
    process.env.BUDGET_SESSION_SECRET ||
    "openbudget-dev-insecure-secret-change-me"
  );
}
async function hmacKey(): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw", utf8(sessionSecret()),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]
  );
}
async function sign(payloadB64: string): Promise<string> {
  const key = await hmacKey();
  const sig = await crypto.subtle.sign("HMAC", key, utf8(payloadB64));
  return b64urlEncode(new Uint8Array(sig));
}
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export interface SessionPayload {
  email: string;
  iat: number;
  exp: number;
}

export async function signSession(email: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const payload: SessionPayload = {
    email: normalizeEmail(email),
    iat: now,
    exp: now + SESSION_TTL_SECONDS,
  };
  const payloadB64 = b64urlEncode(utf8(JSON.stringify(payload)));
  const sig = await sign(payloadB64);
  return `${payloadB64}.${sig}`;
}

export async function verifySession(
  token: string | undefined | null
): Promise<SessionPayload | null> {
  if (!token || typeof token !== "string" || !token.includes(".")) return null;
  const [payloadB64, sig] = token.split(".");
  if (!payloadB64 || !sig) return null;
  try {
    const expected = await sign(payloadB64);
    if (!safeEqual(sig, expected)) return null;
    const json = new TextDecoder().decode(b64urlDecode(payloadB64));
    const payload = JSON.parse(json) as SessionPayload;
    const now = Math.floor(Date.now() / 1000);
    if (!payload.exp || payload.exp < now) return null;
    if (!payload.email || !isAllowed(payload.email)) return null;
    return payload;
  } catch {
    return null;
  }
}

// --- single-use magic-link token hashing ---
export function generateRawToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}
export async function hashToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", utf8(token));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
