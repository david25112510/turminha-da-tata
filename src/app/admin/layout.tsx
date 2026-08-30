import Link from "next/link";
import Image from "next/image";
import { auth, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import { DevFooter } from "@/components/tata/DevFooter";
import { AdminBottomNav } from "./BottomNav";

export const dynamic = "force-dynamic";

const NAV_ITEMS = [
  { href: "/admin", label: "Início" },
  { href: "/admin/criancas", label: "Crianças" },
  { href: "/admin/cuidadoras", label: "Cuidadoras" },
  { href: "/admin/responsaveis", label: "Responsáveis" },
  { href: "/admin/rotina", label: "Rotina" },
  { href: "/admin/fotos", label: "Fotos" },
  { href: "/admin/medicamentos", label: "Medicamentos" },
  { href: "/admin/observacoes", label: "Observações" },
  { href: "/admin/solicitacoes", label: "Solicitações" },
  { href: "/admin/matriculas", label: "Matrículas" },
  { href: "/admin/comunicados", label: "Comunicados" },
  { href: "/admin/financeiro", label: "Financeiro" },
  { href: "/admin/contratos", label: "Contratos" },
  { href: "/admin/relatorios", label: "Relatórios" },
  { href: "/admin/notificacoes", label: "Notificações" },
  { href: "/admin/auditoria", label: "Auditoria" },
  { href: "/admin/configuracoes", label: "Configurações" },
  { href: "/admin/sobre", label: "Sobre" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const unreadNotifications = await prisma.adminNotification.count({ where: { read: false } });

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-tata-surface-alt">
      {/* Header mobile */}
      <header className="md:hidden flex items-center justify-between px-4 py-3 bg-tata-surface border-b border-tata-border">
        <Link href="/admin" className="flex items-baseline gap-1.5 font-[family-name:var(--font-baloo)] font-bold text-lg">
          <span className="text-tata-green">Turminha</span>
          <span className="text-tata-coral">Tata</span>
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/notificacoes"
            aria-label={unreadNotifications > 0 ? `Notificações — ${unreadNotifications} não lidas` : "Notificações"}
            className="relative min-h-11 min-w-11 flex items-center justify-center text-lg"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></svg>
            {unreadNotifications > 0 && (
              <span aria-hidden="true" className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-tata-coral" />
            )}
          </Link>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button type="submit" className="min-h-11 px-2 text-xs font-semibold text-tata-coral-dark">
              Sair
            </button>
          </form>
        </div>
      </header>

      {/* Sidebar desktop */}
      <aside className="hidden md:flex w-[232px] bg-tata-surface border-r border-tata-border flex-col gap-6 p-5 shrink-0">
        <div className="flex items-baseline gap-1.5 font-[family-name:var(--font-baloo)] font-bold text-lg px-2">
          <span className="text-tata-green">Turminha</span>
          <span className="text-tata-coral">Tata</span>
        </div>

        <nav className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-4 py-2.5 rounded-2xl text-sm font-semibold text-tata-ink-soft hover:bg-tata-surface-hover transition-colors"
            >
              {item.label}
              {item.href === "/admin/notificacoes" && unreadNotifications > 0 && (
                <span className="ml-auto text-xs font-bold bg-tata-coral text-white rounded-full px-1.5 py-0.5">
                  {unreadNotifications}
                </span>
              )}
            </Link>
          ))}
        </nav>

        <div className="mt-auto flex items-center gap-2.5 p-2.5 bg-tata-yellow-soft rounded-2xl">
          <div className="relative w-8 h-11 shrink-0">
            <Image src="/images/tata-mascote.png" alt="" fill className="object-contain" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold text-tata-ink-deep truncate">
              {session?.user.name}
            </div>
            <div className="text-[10px] text-tata-ink-muted-alt">Administradora</div>
          </div>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button
              type="submit"
              className="text-[10px] font-semibold text-tata-coral-dark hover:underline"
            >
              Sair
            </button>
          </form>
        </div>

        <DevFooter className="px-2" />
      </aside>

      <main className="flex-1 min-w-0 pb-20 md:pb-0">{children}</main>

      <AdminBottomNav />
    </div>
  );
}
