"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useId, useRef } from "react";

const PRIMARY_ITEMS = [
  { href: "/admin", icon: "🏠", label: "Início" },
  { href: "/admin/criancas", icon: "👧", label: "Crianças" },
  { href: "/admin/cuidadoras", icon: "👩🏾‍🏫", label: "Cuidadoras" },
  { href: "/admin/financeiro", icon: "💰", label: "Financeiro" },
];

const MORE_ITEMS = [
  { href: "/admin/responsaveis", icon: "👨‍👩‍👧", label: "Responsáveis" },
  { href: "/admin/rotina", icon: "📅", label: "Rotina" },
  { href: "/admin/comunicados", icon: "📣", label: "Comunicados" },
  { href: "/admin/relatorios", icon: "📊", label: "Relatórios" },
  { href: "/admin/notificacoes", icon: "🔔", label: "Notificações" },
  { href: "/admin/auditoria", icon: "📋", label: "Auditoria" },
  { href: "/admin/configuracoes", icon: "⚙️", label: "Configurações" },
];

/** Navegação inferior do admin no mobile — 4 destinos diretos + "Mais" para o resto, espelhando o BottomNav da cuidadora. */
export function AdminBottomNav() {
  const pathname = usePathname();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  const moreActive = MORE_ITEMS.some((item) => pathname.startsWith(item.href));

  return (
    <>
      <nav
        aria-label="Navegação principal"
        className="md:hidden fixed bottom-0 inset-x-0 z-40 flex items-stretch bg-tata-surface border-t border-tata-border pb-[env(safe-area-inset-bottom)]"
      >
        {PRIMARY_ITEMS.map((item) => {
          const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 min-h-14 flex flex-col items-center justify-center gap-0.5 text-xs font-semibold ${
                active ? "text-tata-green" : "text-tata-ink-muted"
              }`}
            >
              <span className="text-xl" aria-hidden="true">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => dialogRef.current?.showModal()}
          className={`flex-1 min-h-14 flex flex-col items-center justify-center gap-0.5 text-xs font-semibold ${
            moreActive ? "text-tata-green" : "text-tata-ink-muted"
          }`}
        >
          <span className="text-xl" aria-hidden="true">⋯</span>
          Mais
        </button>
      </nav>

      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        className="rounded-t-2xl sm:rounded-2xl p-0 backdrop:bg-black/40 w-full sm:w-[calc(100%-2rem)] sm:max-w-sm m-0 sm:m-auto mt-auto sm:mt-auto mb-0"
        onClick={(e) => {
          if (e.target === e.currentTarget) dialogRef.current?.close();
        }}
      >
        <div className="p-5 flex flex-col gap-3 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
          <h2 id={titleId} className="font-[family-name:var(--font-baloo)] font-semibold text-base text-tata-ink">
            Mais opções
          </h2>
          <div className="grid grid-cols-3 gap-2.5">
            {MORE_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => dialogRef.current?.close()}
                className="min-h-16 flex flex-col items-center justify-center gap-1 bg-tata-surface-alt rounded-2xl py-3"
              >
                <span className="text-xl" aria-hidden="true">{item.icon}</span>
                <span className="text-xs font-semibold text-tata-ink text-center">{item.label}</span>
              </Link>
            ))}
          </div>
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            className="min-h-11 text-xs font-semibold text-tata-ink-muted"
          >
            Fechar
          </button>
        </div>
      </dialog>
    </>
  );
}
