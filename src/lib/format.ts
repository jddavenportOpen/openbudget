export function money(n: number | null | undefined, opts?: { sign?: boolean }): string {
  const v = Number(n ?? 0);
  const abs = Math.abs(v).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  if (opts?.sign) return (v < 0 ? "-" : "+") + abs;
  return (v < 0 ? "-" : "") + abs;
}

export function money0(n: number | null | undefined): string {
  return Number(n ?? 0).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

export function monthLabel(month: string): string {
  // "2026-06" -> "June 2026"
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, (m || 1) - 1, 1);
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export function dateLabel(iso: string): string {
  // "2026-06-01" -> "Jun 1"
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1);
  return dt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
