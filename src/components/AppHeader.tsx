/**
 * Page header — title + app branding + logout.
 * Server component (no client state needed).
 * Optional back link (used by the card drill-down).
 */
import Link from "next/link";
import { ChevronLeft, LogOut } from "lucide-react";
import { HexBadge } from "@/components/Honeycomb";

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "OpenBudget";
const APP_INITIALS = (APP_NAME.replace(/[^A-Za-z]/g, "").slice(0, 2) || "OB").toUpperCase();

export default function AppHeader({
  title,
  subtitle,
  email,
  backHref,
  backLabel,
}: {
  title: string;
  subtitle?: string;
  email?: string | null;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <header className="pt-6 pb-3">
      {backHref && (
        <Link
          href={backHref}
          className="inline-flex items-center gap-1 text-sm font-medium text-teal-700 -ml-1 mb-2 active:scale-95 transition-transform"
        >
          <ChevronLeft size={18} strokeWidth={2.4} />
          {backLabel || "Back"}
        </Link>
      )}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5 min-w-0">
          <HexBadge className="w-9 h-9 shrink-0 mt-0.5">
            <span className="text-teal-700 font-bold text-sm leading-none tracking-tight">{APP_INITIALS}</span>
          </HexBadge>
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.14em] text-teal-700/70 font-semibold">
              {APP_NAME}
            </p>
            <h1 className="text-2xl font-bold tracking-tight text-ink mt-0.5 truncate">{title}</h1>
            {subtitle && <p className="text-sm text-slate2 mt-1">{subtitle}</p>}
          </div>
        </div>
        <a
          href="/api/auth/logout"
          className="inline-flex items-center gap-1 text-[11px] text-slate2 shrink-0 mt-1 hover:text-ink transition-colors"
          title={email ?? undefined}
        >
          <LogOut size={13} />
          Sign out
        </a>
      </div>
    </header>
  );
}
