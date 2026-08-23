"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/pais", icon: "🏠", label: "Início" },
  { href: "/pais/jornada", icon: "👧", label: "Rotina" },
  { href: "/pais/fotos", icon: "📷", label: "Fotos" },
  { href: "/pais/financeiro", icon: "💰", label: "Financeiro" },
  { href: "/pais/perfil", icon: "👤", label: "Perfil" },
];

/** Navegação inferior, visível só em telas pequenas — 5 destinos reais, alvos de toque ≥44px. */
export function BottomNav({ unreadCount }: { unreadCount: number }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navegação principal"
      className="md:hidden fixed bottom-0 inset-x-0 z-40 flex items-stretch bg-[#FFFDF8] border-t border-[#ECE1CB] pb-[env(safe-area-inset-bottom)]"
    >
      {ITEMS.map((item) => {
        const active = item.href === "/pais" ? pathname === "/pais" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`relative flex-1 min-h-14 flex flex-col items-center justify-center gap-0.5 text-xs font-semibold ${
              active ? "text-[#1FA787]" : "text-[#9A8A72]"
            }`}
          >
            <span className="relative text-xl" aria-hidden="true">
              {item.icon}
              {item.href === "/pais" && unreadCount > 0 && (
                <span className="absolute -top-1 -right-2 bg-[#E85570] text-white text-[9px] font-bold min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
