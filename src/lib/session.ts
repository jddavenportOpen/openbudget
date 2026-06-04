/**
 * session.ts — read the authenticated email from the session cookie inside
 * route handlers / server components. Middleware already guarantees a valid
 * session on gated routes; routes call this to get the editor email.
 */
import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySession } from "@/lib/auth";

export async function currentEmail(): Promise<string | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  const session = await verifySession(token);
  return session?.email ?? null;
}
