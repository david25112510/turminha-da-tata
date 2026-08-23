"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/cuidadora", icon: "🏠", label: "Início" },
  { href: "/cuidadora#buscar", icon: "➕", label: "Registrar", primary: true },
  { href: "/cuidadora/alertas", icon: "🔔", label: "Alertas" },
];

/** Navegação inferior, visível só em telas pequenas — 3 destinos reais, alvos de toque ≥44px. */
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navegação principal"
      className="md:hidden fixed bottom-0 inset-x-0 z-40 flex items-stretch bg-tata-surface border-t border-tata-border pb-[env(safe-area-inset-bottom)]"
    >
      {ITEMS.map((item) => {
        const active = item.href === "/cuidadora" ? pathname === "/cuidadora" : pathname.startsWith(item.href.split("#")[0]) && item.href !== "/cuidadora#buscar";
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex-1 min-h-14 flex flex-col items-center justify-center gap-0.5 text-xs font-semibold ${
              item.primary ? "text-tata-green" : active ? "text-tata-green" : "text-tata-ink-muted"
            }`}
          >
            <span className={`text-xl ${item.primary ? "leading-none" : ""}`} aria-hidden="true">
              {item.icon}
            </span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
