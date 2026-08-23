import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getMonthlyOvertimeBreakdown } from "@/lib/financial";
import { INVOICE_STATUS_LABELS, MONTH_LABELS } from "@/lib/labels";

const currency = (n: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);

export default async function FinancialOverviewPage() {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  const children = await prisma.child.findMany({
    where: { status: "ACTIVE" },
    orderBy: { fullName: "asc" },
    include: {
      invoices: { where: { referenceMonth: month, referenceYear: year } },
    },
  });

  const rows = await Promise.all(
    children.map(async (child) => {
      const { total: overtimeSoFar } = await getMonthlyOvertimeBreakdown(child.id, month, year);
      const invoice = child.invoices[0];
      return { child, overtimeSoFar, invoice };
    })
  );

  return (
    <div className="p-8 flex flex-col gap-6">
      <h1 className="font-[family-name:var(--font-baloo)] font-semibold text-xl text-tata-ink">
        Financeiro — {MONTH_LABELS[month - 1]} de {year}
      </h1>

      <div className="bg-tata-surface rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-tata-ink-muted border-b border-tata-border">
              <th className="p-4 font-semibold">Criança</th>
              <th className="p-4 font-semibold">Mensalidade</th>
              <th className="p-4 font-semibold">Horas excedentes (mês)</th>
              <th className="p-4 font-semibold">Status</th>
              <th className="p-4 font-semibold"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ child, overtimeSoFar, invoice }) => (
              <tr key={child.id} className="border-b border-tata-surface-hover last:border-0">
                <td className="p-4 font-medium text-tata-ink">
                  <Link href={`/admin/financeiro/${child.id}`} className="hover:text-tata-green">
                    {child.preferredName || child.fullName}
                  </Link>
                </td>
                <td className="p-4 text-tata-ink-soft">{currency(Number(child.monthlyFee))}</td>
                <td className="p-4 text-tata-ink-soft">{currency(overtimeSoFar)}</td>
                <td className="p-4">
                  {invoice ? (
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-tata-green/10 text-tata-green-dark">
                      {INVOICE_STATUS_LABELS[invoice.status]}
                    </span>
                  ) : (
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-tata-ink-muted/10 text-tata-ink-muted">
                      Não fechado
                    </span>
                  )}
                </td>
                <td className="p-4">
                  <Link href={`/admin/financeiro/${child.id}`} className="text-xs font-semibold text-tata-green hover:underline">
                    Ver detalhes
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
