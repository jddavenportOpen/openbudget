"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, CreditCard, Mail, CheckSquare, type LucideIcon } from "lucide-react";

const TABS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/", label: "Home", icon: Home },
  { href: "/transactions", label: "Activity", icon: CreditCard },
  { href: "/budget", label: "Budget", icon: Mail },
  { href: "/todos", label: "To-Do", icon: CheckSquare },
];

export default function BottomNav() {
  const path = usePathname();
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-teal-900/10 bg-white/85 backdrop-blur-md pb-[env(safe-area-inset-bottom)]">
      <div className="max-w-2xl mx-auto grid grid-cols-4">
        {TABS.map((t) => {
          const active = t.href === "/" ? path === "/" : path.startsWith(t.href);
          const Icon = t.icon;
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`flex flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-medium transition-colors ${
                active ? "text-teal-700" : "text-slate2"
              }`}
            >
              <Icon
                size={20}
                strokeWidth={active ? 2.4 : 2}
                className={`transition-transform ${active ? "scale-110" : "opacity-70"}`}
              />
              {t.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
