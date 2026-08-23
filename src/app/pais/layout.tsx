import Link from "next/link";
import Image from "next/image";
import { auth, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import { requireGuardian } from "@/lib/guardian";
import { PushNotificationToggle } from "./PushNotificationToggle";
import { BottomNav } from "./BottomNav";
import { OfflineBanner } from "../cuidadora/OfflineBanner";

// Mesmos 5 destinos primários da BottomNav (mobile) — Atividades/Comunicados/Agenda continuam acessíveis via
// atalhos no Início e no Perfil. Nove itens não cabiam na faixa de desktop junto com nome, push toggle e Sair
// (estourava horizontalmente até 1024px); manter os dois níveis de navegação com a mesma informação evita
// esse problema e mantém a mesma arquitetura de informação em qualquer largura de tela.
const NAV_ITEMS = [
  { href: "/pais", label: "Início" },
  { href: "/pais/jornada", label: "Jornada" },
  { href: "/pais/fotos", label: "Fotos" },
  { href: "/pais/financeiro", label: "Financeiro" },
  { href: "/pais/perfil", label: "Perfil" },
];

export default async function GuardianLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const guardian = await requireGuardian();
  const unreadCount = await prisma.notification.count({
    where: { guardianId: guardian.id, read: false },
  });

  return (
    <div className="min-h-screen flex flex-col bg-[#FDF8EE]">
      <OfflineBanner />

      <header className="flex items-center justify-between px-4 sm:px-6 py-3 bg-[#FFFDF8] border-b border-[#ECE1CB]">
        <Link href="/pais" className="flex flex-col leading-tight">
          <span className="flex items-baseline gap-1.5 font-[family-name:var(--font-baloo)] font-bold text-lg">
            <span className="text-[#1FA787]">Turminha</span>
            <span className="text-[#FF6F8E]">Tata</span>
          </span>
          <span className="text-[10px] font-semibold text-[#9A8A72] tracking-wide uppercase">Portal dos pais</span>
        </Link>

        <nav className="hidden lg:flex items-center gap-1">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="px-3 py-1.5 rounded-full text-sm font-semibold text-[#6B5D4A] hover:bg-[#F3EEE1] transition-colors"
            >
              {item.label}
              {item.href === "/pais" && unreadCount > 0 && (
                <span className="ml-1.5 bg-[#E85570] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {unreadCount}
                </span>
              )}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <div className="relative w-7 h-9 shrink-0 hidden sm:block">
            <Image src="/images/tata-mascote.png" alt="" fill className="object-contain" />
          </div>
          <div className="text-sm font-semibold text-[#3A2E22] hidden sm:block">{session?.user.name}</div>
          <div className="hidden lg:block">
            <PushNotificationToggle />
          </div>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button type="submit" className="min-h-11 px-2 text-xs font-semibold text-[#E85570]">
              Sair
            </button>
          </form>
        </div>
      </header>

      {/* A nav de desktop (9 itens + logo + usuário + push toggle) só cabe a partir de ~1024px — abaixo
          disso (inclusive tablet em pé, 768px) usa a BottomNav, senão fica sem nav nenhuma cabendo na tela.
          Atividades/Comunicados/Agenda/Notificações continuam acessíveis via atalhos no Início e no Perfil. */}
      <main className="flex-1 pb-20 lg:pb-0">{children}</main>

      <BottomNav unreadCount={unreadCount} />
    </div>
  );
}
