/**
 * /setup — first-run readiness check. Reports which required environment
 * variables are configured WITHOUT ever revealing their values (presence only).
 * This page is public (added to middleware's PUBLIC_PREFIXES) so you can reach it
 * before sign-in works. Once everything is green, go to /login.
 */
import { CheckCircle2, XCircle, AlertTriangle } from "lucide-react";

export const dynamic = "force-dynamic";

type Check = { label: string; ok: boolean; required: boolean; hint: string };

function present(...names: string[]): boolean {
  return names.some((n) => !!(process.env[n] && process.env[n]!.trim()));
}

export default function SetupPage() {
  const checks: Check[] = [
    {
      label: "SUPABASE_URL",
      ok: present("SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL"),
      required: true,
      hint: "Your Supabase project URL (Settings → API).",
    },
    {
      label: "SUPABASE_SERVICE_ROLE_KEY",
      ok: present("SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_SERVICE_KEY"),
      required: true,
      hint: "Supabase service-role key — server-only, keep it secret.",
    },
    {
      label: "ALLOWED_EMAILS",
      ok: present("ALLOWED_EMAILS", "BUDGET_ALLOWED_EMAILS"),
      required: true,
      hint: "Comma-separated emails allowed to sign in. Empty = nobody can log in.",
    },
    {
      label: "SESSION_SECRET",
      ok: present("SESSION_SECRET", "BUDGET_SESSION_SECRET"),
      required: true,
      hint: "HMAC secret for session cookies. Generate with: openssl rand -hex 32",
    },
    {
      label: "RESEND_API_KEY",
      ok: present("RESEND_API_KEY"),
      required: true,
      hint: "Resend API key so magic-link emails can be sent.",
    },
    {
      label: "SIMPLEFIN_ACCESS_URL",
      ok: present("SIMPLEFIN_ACCESS_URL"),
      required: false,
      hint: "Only needed where you RUN the sync (cron/CI), not for the web app itself.",
    },
  ];

  const missingRequired = checks.filter((c) => c.required && !c.ok);
  const ready = missingRequired.length === 0;

  return (
    <main className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold tracking-tight text-ink">OpenBudget setup</h1>
      <p className="mt-2 text-sm text-slate2">
        This page checks your configuration. It shows whether each value is set —
        never the value itself.
      </p>

      <div
        className={`mt-5 rounded-xl px-4 py-3 text-sm font-medium ${
          ready ? "bg-teal-50 text-teal-800" : "bg-amber-50 text-amber-800"
        }`}
      >
        {ready
          ? "All required variables are set. You're ready — head to /login."
          : `${missingRequired.length} required variable(s) still need to be set.`}
      </div>

      <ul className="mt-5 space-y-2">
        {checks.map((c) => (
          <li key={c.label} className="card p-3 flex items-start gap-3">
            {c.ok ? (
              <CheckCircle2 size={18} className="text-teal-600 shrink-0 mt-0.5" />
            ) : c.required ? (
              <XCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle size={18} className="text-amber-500 shrink-0 mt-0.5" />
            )}
            <div className="min-w-0">
              <p className="text-sm font-semibold text-ink">
                <code>{c.label}</code>{" "}
                <span className="text-[11px] font-normal text-slate2">
                  {c.required ? "(required)" : "(optional)"}
                </span>
              </p>
              <p className="text-xs text-slate2 mt-0.5">{c.hint}</p>
            </div>
          </li>
        ))}
      </ul>

      <p className="mt-6 text-xs text-slate2">
        Full walkthrough is in <code>SETUP.md</code>. After setting variables on
        your host, redeploy, then sign in at{" "}
        <a href="/login" className="text-teal-700 underline">
          /login
        </a>
        .
      </p>
    </main>
  );
}
