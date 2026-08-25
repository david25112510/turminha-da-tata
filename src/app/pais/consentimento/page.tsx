import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import { requireGuardian } from "@/lib/guardian";
import { acceptConsentAction } from "./actions";
import { ConsentAcceptanceCard } from "./ConsentAcceptanceCard";

export const dynamic = "force-dynamic";

/**
 * Fora do route group (portal), mesmo motivo de src/app/pais/contrato/page.tsx: não herda o
 * layout que bloqueia acesso quando há pendência (contrato OU consentimento), então continua
 * acessível independente do status. Verificada só depois do contrato no layout (ver comentário
 * lá) — se os dois estiverem pendentes, esta tela só aparece depois que o contrato for aceito.
 */
export default async function ConsentAcceptancePage() {
  const guardian = await requireGuardian();

  const pending = await prisma.consentAcceptance.findFirst({
    where: { guardianId: guardian.id, status: "PENDING" },
    include: { version: true },
  });

  if (!pending) redirect("/pais");

  return (
    <div className="min-h-screen flex flex-col bg-tata-surface-alt">
      <header className="flex items-center justify-between px-4 sm:px-6 py-3 bg-tata-surface border-b border-tata-border">
        <div className="flex items-center gap-2.5">
          <div className="relative w-7 h-9 shrink-0 tata-mascot-idle">
            <Image src="/images/tata-mascote.png" alt="" fill sizes="28px" className="object-contain" />
          </div>
          <span className="flex items-baseline gap-1.5 font-[family-name:var(--font-baloo)] font-bold text-lg">
            <span className="text-tata-green">Turminha</span>
            <span className="text-tata-coral">Tata</span>
          </span>
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
      </header>

      <main className="flex-1 p-4 sm:p-6 flex flex-col gap-5 max-w-2xl mx-auto w-full">
        <div>
          <h1 className="font-[family-name:var(--font-baloo)] font-semibold text-xl text-tata-ink">
            Consentimento pendente
          </h1>
          <p className="text-sm text-tata-ink-muted-alt">
            Antes de continuar no Portal dos Pais, leia e registre seu consentimento para o tratamento de dados
            pessoais.
          </p>
        </div>

        <ConsentAcceptanceCard
          acceptanceId={pending.id}
          guardianName={guardian.name}
          version={pending.version.version}
          content={pending.version.content}
          action={acceptConsentAction}
        />

        <Link
          href="/pais"
          className="min-h-11 flex items-center justify-center bg-tata-green text-white rounded-xl px-6 font-[family-name:var(--font-baloo)] font-semibold text-sm"
        >
          Continuar para o Portal
        </Link>
      </main>
    </div>
  );
}
