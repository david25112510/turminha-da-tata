import { prisma } from "@/lib/prisma";
import { requireGuardian, pickChildLink } from "@/lib/guardian";
import { isMercadoPagoConfigured } from "@/lib/mercadopago";
import { EmptyState } from "@/components/tata/EmptyState";
import { ChildSwitcher } from "../ChildSwitcher";
import { FinanceCard } from "./FinanceCard";

export default async function GuardianFinancialPage({
  searchParams,
}: {
  searchParams: Promise<{ childId?: string }>;
}) {
  const { childId } = await searchParams;
  const guardian = await requireGuardian();
  const link = pickChildLink(guardian.children, childId);

  if (!link) {
    return <div className="p-8 text-sm text-tata-ink-muted-alt">Nenhuma criança vinculada à sua conta.</div>;
  }

  if (!link.viewFinancial) {
    return (
      <div className="p-8 text-sm text-tata-ink-muted-alt">
        Você não tem permissão para visualizar o financeiro desta criança.
      </div>
    );
  }

  // A fatura já fechada é uma fotografia do período — o detalhamento vem dos InvoiceItems gravados no
  // fechamento, nunca recalculado ao vivo a partir da presença (que pode já ter sido editada depois).
  const invoices = await prisma.monthlyInvoice.findMany({
    where: { childId: link.childId },
    orderBy: [{ referenceYear: "desc" }, { referenceMonth: "desc" }],
    include: { items: { orderBy: { createdAt: "asc" } } },
  });

  return (
    <div className="p-4 sm:p-6 flex flex-col gap-5 max-w-2xl mx-auto">
      <ChildSwitcher basePath="/pais/financeiro" activeChildId={link.childId} guardianChildren={guardian.children} />

      <h1 className="font-[family-name:var(--font-baloo)] font-semibold text-xl text-tata-ink">
        💰 Financeiro — {link.child.preferredName || link.child.fullName}
      </h1>

      {invoices.length === 0 ? (
        <EmptyState message="Nenhuma mensalidade fechada por aqui ainda 💛" withMascot />
      ) : (
        <div className="flex flex-col gap-3">
          {invoices.map((invoice, i) => (
            <FinanceCard
              key={invoice.id}
              invoice={invoice}
              delayMs={Math.min(i, 8) * 40}
              pixEnabled={isMercadoPagoConfigured()}
            />
          ))}
        </div>
      )}
    </div>
  );
}
