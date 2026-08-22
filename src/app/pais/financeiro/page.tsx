import { prisma } from "@/lib/prisma";
import { requireGuardian, pickChildLink } from "@/lib/guardian";
import { getMonthlyOvertimeBreakdown, effectiveStatus } from "@/lib/financial";
import { INVOICE_STATUS_LABELS, MONTH_LABELS } from "@/lib/labels";
import { ChildSwitcher } from "../ChildSwitcher";

const currency = (n: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);

export default async function GuardianFinancialPage({
  searchParams,
}: {
  searchParams: Promise<{ childId?: string }>;
}) {
  const { childId } = await searchParams;
  const guardian = await requireGuardian();
  const link = pickChildLink(guardian.children, childId);

  if (!link) {
    return <div className="p-8 text-sm text-[#8A7A62]">Nenhuma criança vinculada à sua conta.</div>;
  }

  if (!link.viewFinancial) {
    return (
      <div className="p-8 text-sm text-[#8A7A62]">
        Você não tem permissão para visualizar o financeiro desta criança.
      </div>
    );
  }

  const invoices = await prisma.monthlyInvoice.findMany({
    where: { childId: link.childId },
    orderBy: [{ referenceYear: "desc" }, { referenceMonth: "desc" }],
  });

  const invoicesWithBreakdown = await Promise.all(
    invoices.map(async (inv) => ({
      invoice: inv,
      breakdown: await getMonthlyOvertimeBreakdown(link.childId, inv.referenceMonth, inv.referenceYear),
    }))
  );

  return (
    <div className="p-6 flex flex-col gap-5 max-w-2xl mx-auto">
      <ChildSwitcher basePath="/pais/financeiro" activeChildId={link.childId} guardianChildren={guardian.children} />

      <h1 className="font-[family-name:var(--font-baloo)] font-semibold text-xl text-[#2E2418]">
        Financeiro — {link.child.preferredName || link.child.fullName}
      </h1>

      {invoicesWithBreakdown.length === 0 ? (
        <p className="text-sm text-[#8A7A62]">Nenhuma mensalidade fechada ainda.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {invoicesWithBreakdown.map(({ invoice, breakdown }) => (
            <div key={invoice.id} className="bg-[#FFFDF8] rounded-2xl shadow-sm p-5">
              <div className="flex items-center justify-between">
                <span className="font-[family-name:var(--font-baloo)] font-semibold text-sm text-[#2E2418]">
                  Mensalidade de {MONTH_LABELS[invoice.referenceMonth - 1]}
                </span>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#1FA787]/10 text-[#1F8A6E]">
                  {INVOICE_STATUS_LABELS[effectiveStatus(invoice)]}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 mt-3 text-sm">
                <div>
                  <span className="text-xs text-[#9A8A72] block">Mensalidade</span>
                  <span className="text-[#2E2418]">{currency(Number(invoice.monthlyFee))}</span>
                </div>
                <div>
                  <span className="text-xs text-[#9A8A72] block">Horas excedentes</span>
                  <span className="text-[#2E2418]">{currency(Number(invoice.overtimeTotal))}</span>
                </div>
                <div>
                  <span className="text-xs text-[#9A8A72] block">Total</span>
                  <span className="font-semibold text-[#2E2418]">{currency(Number(invoice.totalAmount))}</span>
                </div>
              </div>

              {breakdown.entries.length > 0 && (
                <details className="mt-3">
                  <summary className="text-xs font-semibold text-[#1FA787] cursor-pointer">
                    Horas excedentes
                  </summary>
                  <div className="flex flex-col gap-1 mt-2">
                    {breakdown.entries.map((e, i) => (
                      <div key={i} className="flex justify-between text-xs text-[#6B5D4A]">
                        <span>{new Intl.DateTimeFormat("pt-BR").format(e.date)} — {e.minutesLate} min</span>
                        <span>{currency(e.amount)}</span>
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
