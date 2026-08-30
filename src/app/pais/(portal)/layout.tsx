import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import { requireGuardian } from "@/lib/guardian";
import { PushNotificationToggle } from "./PushNotificationToggle";
import { BottomNav } from "./BottomNav";
import { OfflineBanner } from "../../cuidadora/OfflineBanner";

export const dynamic = "force-dynamic";

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

  const pendingContracts = await prisma.contractAcceptance.count({
    where: { guardianId: guardian.id, status: "PENDING" },
  });
  if (pendingContracts > 0) redirect("/pais/contrato");

  // Verificado depois do contrato de propósito: se os dois estiverem pendentes, o responsável vê
  // primeiro o contrato de prestação de serviços, depois (na navegação seguinte) o consentimento.
  const pendingConsents = await prisma.consentAcceptance.count({
    where: { guardianId: guardian.id, status: "PENDING" },
  });
  if (pendingConsents > 0) redirect("/pais/consentimento");

  // Verificada por último, mesmo motivo: contrato → consentimento → política de privacidade, uma
  // pendência de cada vez.
  const pendingPrivacyPolicies = await prisma.privacyPolicyAcceptance.count({
    where: { guardianId: guardian.id, status: "PENDING" },
  });
  if (pendingPrivacyPolicies > 0) redirect("/pais/privacidade");

  const unreadCount = await prisma.notification.count({
    where: { guardianId: guardian.id, read: false },
  });

  return (
    <div className="min-h-screen flex flex-col bg-tata-surface-alt">
      <OfflineBanner />

      <header className="flex items-center justify-between px-4 sm:px-6 py-3 bg-tata-surface border-b border-tata-border">
        <Link href="/pais" className="flex flex-col leading-tight">
          <span className="flex items-baseline gap-1.5 font-[family-name:var(--font-baloo)] font-bold text-lg">
            <span className="text-tata-green">Turminha</span>
            <span className="text-tata-coral">Tata</span>
          </span>
          <span className="text-[10px] font-semibold text-tata-ink-muted tracking-wide uppercase">Portal dos pais</span>
        </Link>

        <nav className="hidden lg:flex items-center gap-1">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="px-3 py-1.5 rounded-full text-sm font-semibold text-tata-ink-soft hover:bg-tata-surface-hover transition-colors"
            >
              {item.label}
              {item.href === "/pais" && unreadCount > 0 && (
                <span className="ml-1.5 bg-tata-coral-dark text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {unreadCount}
                </span>
              )}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <div className="relative w-7 h-9 shrink-0 tata-mascot-idle">
            <Image src="/images/tata-mascote.png" alt="" fill className="object-contain" />
          </div>
          <div className="text-sm font-semibold text-tata-ink-deep hidden sm:block">{session?.user.name}</div>
          <div className="hidden lg:block">
            <PushNotificationToggle />
          </div>
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

      {/* A nav de desktop (9 itens + logo + usuário + push toggle) só cabe a partir de ~1024px — abaixo
          disso (inclusive tablet em pé, 768px) usa a BottomNav, senão fica sem nav nenhuma cabendo na tela.
          Atividades/Comunicados/Agenda/Notificações continuam acessíveis via atalhos no Início e no Perfil. */}
      <main className="flex-1 pb-20 lg:pb-0">{children}</main>

      <BottomNav unreadCount={unreadCount} />
    </div>
  );
}
