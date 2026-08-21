import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getMonthlyOvertimeBreakdown, effectiveStatus } from "@/lib/financial";
import { INVOICE_STATUS_LABELS, MONTH_LABELS } from "@/lib/labels";
import { closeMonthAction, registerPaymentAction } from "../actions";

const currency = (n: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);
const inputClass =
  "border border-[#ECE1CB] rounded-xl px-3 py-2 text-sm outline-none focus:border-[#1FA787] transition-colors bg-white";
const cardClass = "bg-[#FFFDF8] rounded-2xl shadow-sm p-5 flex flex-col gap-4";
const cardTitle = "font-[family-name:var(--font-baloo)] font-semibold text-base text-[#2E2418]";

export default async function ChildFinancialDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ childId: string }>;
  searchParams: Promise<{ month?: string; year?: string }>;
}) {
  const { childId } = await params;
  const query = await searchParams;
  const now = new Date();
  const month = Number(query.month) || now.getMonth() + 1;
  const year = Number(query.year) || now.getFullYear();

  const child = await prisma.child.findUnique({ where: { id: childId } });
  if (!child) notFound();

  const [invoices, breakdown, currentInvoice] = await Promise.all([
    prisma.monthlyInvoice.findMany({
      where: { childId },
      orderBy: [{ referenceYear: "desc" }, { referenceMonth: "desc" }],
      include: { payments: true },
    }),
    getMonthlyOvertimeBreakdown(childId, month, year),
    prisma.monthlyInvoice.findUnique({
      where: { childId_referenceMonth_referenceYear: { childId, referenceMonth: month, referenceYear: year } },
      include: { payments: { orderBy: { paidAt: "desc" } } },
    }),
  ]);

  return (
    <div className="p-8 flex flex-col gap-6 max-w-3xl">
      <h1 className="font-[family-name:var(--font-baloo)] font-semibold text-xl text-[#2E2418]">
        Financeiro — {child.preferredName || child.fullName}
      </h1>

      <div className={cardClass}>
        <span className={cardTitle}>
          {MONTH_LABELS[month - 1]} de {year}
        </span>

        <div className="grid grid-cols-3 gap-3 text-sm">
          <div>
            <span className="text-xs text-[#9A8A72] block">Mensalidade</span>
            <span className="font-semibold text-[#2E2418]">{currency(Number(child.monthlyFee))}</span>
          </div>
          <div>
            <span className="text-xs text-[#9A8A72] block">Horas excedentes</span>
            <span className="font-semibold text-[#2E2418]">{currency(breakdown.total)}</span>
          </div>
          <div>
            <span className="text-xs text-[#9A8A72] block">Total estimado</span>
            <span className="font-semibold text-[#2E2418]">
              {currency(Number(child.monthlyFee) + breakdown.total)}
            </span>
          </div>
        </div>

        {breakdown.entries.length > 0 && (
          <div className="border-t border-[#ECE1CB] pt-3 flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-[#9A8A72]">Detalhamento das horas excedentes</span>
            {breakdown.entries.map((e, i) => (
              <div key={i} className="flex justify-between text-sm text-[#6B5D4A]">
                <span>{new Intl.DateTimeFormat("pt-BR").format(e.date)} — {e.minutesLate} min</span>
                <span>{currency(e.amount)}</span>
              </div>
            ))}
          </div>
        )}

        {!currentInvoice && (
          <form action={closeMonthAction} className="flex gap-3 items-end border-t border-[#ECE1CB] pt-3">
            <input type="hidden" name="childId" value={childId} />
            <input type="hidden" name="month" value={month} />
            <input type="hidden" name="year" value={year} />
            <label className="flex flex-col gap-1 text-xs text-[#6B5D4A]">
              Descontos
              <input name="discounts" placeholder="0,00" className={inputClass} />
            </label>
            <label className="flex flex-col gap-1 text-xs text-[#6B5D4A]">
              Outros
              <input name="otherCharges" placeholder="0,00" className={inputClass} />
            </label>
            <button
              type="submit"
              className="bg-[#FF6F8E] text-white rounded-xl px-5 py-2 font-[family-name:var(--font-baloo)] font-semibold text-sm"
            >
              Fechar mês
            </button>
          </form>
        )}

        {currentInvoice && (
          <div className="border-t border-[#ECE1CB] pt-3 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-[#2E2418]">
                Total: {currency(Number(currentInvoice.totalAmount))}
              </span>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#1FA787]/10 text-[#1F8A6E]">
                {INVOICE_STATUS_LABELS[effectiveStatus(currentInvoice)]}
              </span>
            </div>
            <p className="text-xs text-[#9A8A72]">
              Pago até agora: {currency(Number(currentInvoice.paidAmount))} — Vencimento:{" "}
              {new Intl.DateTimeFormat("pt-BR").format(currentInvoice.dueDate)}
            </p>

            {currentInvoice.payments.length > 0 && (
              <div className="flex flex-col gap-1">
                {currentInvoice.payments.map((p) => (
                  <div key={p.id} className="text-xs text-[#6B5D4A] flex justify-between">
                    <span>{new Intl.DateTimeFormat("pt-BR").format(p.paidAt)} {p.method ? `— ${p.method}` : ""}</span>
                    <span>{currency(Number(p.amount))}</span>
                  </div>
                ))}
              </div>
            )}

            {currentInvoice.status !== "PAID" && currentInvoice.status !== "CANCELLED" && (
              <form action={registerPaymentAction} className="flex gap-3 items-end">
                <input type="hidden" name="invoiceId" value={currentInvoice.id} />
                <input type="hidden" name="childId" value={childId} />
                <label className="flex flex-col gap-1 text-xs text-[#6B5D4A]">
                  Valor
                  <input name="amount" placeholder="0,00" required className={inputClass} />
                </label>
                <label className="flex flex-col gap-1 text-xs text-[#6B5D4A]">
                  Forma
                  <input name="method" placeholder="Pix, cartão..." className={inputClass} />
                </label>
                <button
                  type="submit"
                  className="bg-[#1FA787] text-white rounded-xl px-5 py-2 font-[family-name:var(--font-baloo)] font-semibold text-sm"
                >
                  Registrar pagamento
                </button>
              </form>
            )}
          </div>
        )}
      </div>

      <div className={cardClass}>
        <span className={cardTitle}>Histórico</span>
        {invoices.length === 0 ? (
          <p className="text-sm text-[#8A7A62]">Nenhum mês fechado ainda.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {invoices.map((inv) => (
              <li key={inv.id} className="flex items-center justify-between text-sm border-b border-[#F3EEE1] pb-2 last:border-0">
                <span className="text-[#2E2418]">
                  {MONTH_LABELS[inv.referenceMonth - 1]} de {inv.referenceYear}
                </span>
                <span className="text-[#6B5D4A]">{currency(Number(inv.totalAmount))}</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#1FA787]/10 text-[#1F8A6E]">
                  {INVOICE_STATUS_LABELS[effectiveStatus(inv)]}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
