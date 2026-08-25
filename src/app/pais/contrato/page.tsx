import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import { requireGuardian } from "@/lib/guardian";
import { acceptContractAction } from "./actions";
import { ContractAcceptanceCard } from "./ContractAcceptanceCard";

export const dynamic = "force-dynamic";

/**
 * Fora do route group (portal) de propósito — não herda o layout que bloqueia acesso quando há
 * contrato pendente, então esta é a única rota do Portal dos Pais sempre acessível independente do
 * status do aceite (junto com o logout, que é uma Server Action, não uma rota).
 */
export default async function ContractAcceptancePage() {
  const guardian = await requireGuardian();

  const pending = await prisma.contractAcceptance.findMany({
    where: { guardianId: guardian.id, status: "PENDING" },
    include: { child: true, version: true },
    orderBy: { createdAt: "asc" },
  });

  if (pending.length === 0) redirect("/pais");

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
            Contrato pendente
          </h1>
          <p className="text-sm text-tata-ink-muted-alt">
            Antes de acessar o Portal dos Pais, leia e aceite o contrato de prestação de serviços abaixo.
          </p>
        </div>

        {pending.map((acceptance) => (
          <ContractAcceptanceCard
            key={acceptance.id}
            acceptanceId={acceptance.id}
            childName={acceptance.child.preferredName || acceptance.child.fullName}
            guardianName={guardian.name}
            version={acceptance.version.version}
            content={acceptance.version.content}
            action={acceptContractAction}
          />
        ))}

        <Link
          href="/pais"
          className="min-h-11 flex items-center justify-center bg-tata-green text-white rounded-xl px-6 font-[family-name:var(--font-baloo)] font-semibold text-sm"
        >
          Continuar para o Portal
        </Link>
        <p className="text-center text-xs text-tata-ink-muted">
          Você só chega ao portal depois de aceitar todos os contratos pendentes acima.
        </p>
      </main>
    </div>
  );
}
