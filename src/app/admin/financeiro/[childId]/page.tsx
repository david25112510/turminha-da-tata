import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getMonthlyOvertimeBreakdown, effectiveStatus } from "@/lib/financial";
import { INVOICE_ITEM_TYPE_LABELS, INVOICE_STATUS_LABELS, MONTH_LABELS } from "@/lib/labels";
import { applyInvoiceAdjustmentAction, cancelInvoiceAction, closeMonthAction, registerPaymentAction } from "../actions";

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

  const [invoices, currentInvoice] = await Promise.all([
    prisma.monthlyInvoice.findMany({
      where: { childId },
      orderBy: [{ referenceYear: "desc" }, { referenceMonth: "desc" }],
      include: { payments: true },
    }),
    prisma.monthlyInvoice.findUnique({
      where: { childId_referenceMonth_referenceYear: { childId, referenceMonth: month, referenceYear: year } },
      include: { payments: { orderBy: { paidAt: "desc" } }, items: { orderBy: { createdAt: "asc" } } },
    }),
  ]);

  // Sem fatura fechada ainda: mostra uma estimativa recalculada ao vivo a partir da presença do mês.
  // Depois de fechada, o total e o detalhamento vêm exclusivamente dos InvoiceItems (fotografia do período).
  const livePreview = currentInvoice ? null : await getMonthlyOvertimeBreakdown(childId, month, year);

  const canAdjust = currentInvoice && currentInvoice.status !== "CANCELLED";
  const canCancel = currentInvoice && currentInvoice.status !== "CANCELLED" && Number(currentInvoice.paidAmount) === 0;

  return (
    <div className="p-8 flex flex-col gap-6 max-w-3xl">
      <h1 className="font-[family-name:var(--font-baloo)] font-semibold text-xl text-[#2E2418]">
        Financeiro — {child.preferredName || child.fullName}
      </h1>

      <div className={cardClass}>
        <span className={cardTitle}>
          {MONTH_LABELS[month - 1]} de {year}
        </span>

        {livePreview && (
          <>
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div>
                <span className="text-xs text-[#9A8A72] block">Mensalidade</span>
                <span className="font-semibold text-[#2E2418]">{currency(Number(child.monthlyFee))}</span>
              </div>
              <div>
                <span className="text-xs text-[#9A8A72] block">Horas excedentes (estimativa)</span>
                <span className="font-semibold text-[#2E2418]">{currency(livePreview.total)}</span>
              </div>
              <div>
                <span className="text-xs text-[#9A8A72] block">Total estimado</span>
                <span className="font-semibold text-[#2E2418]">
                  {currency(Number(child.monthlyFee) + livePreview.total)}
                </span>
              </div>
            </div>

            {livePreview.entries.length > 0 && (
              <div className="border-t border-[#ECE1CB] pt-3 flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-[#9A8A72]">
                  Detalhamento das horas excedentes (estimativa — ainda não fechada)
                </span>
                {livePreview.entries.map((e, i) => (
                  <div key={i} className="flex justify-between text-sm text-[#6B5D4A]">
                    <span>{new Intl.DateTimeFormat("pt-BR").format(e.date)} — {e.minutesLate} min</span>
                    <span>{currency(e.amount)}</span>
                  </div>
                ))}
              </div>
            )}

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
          </>
        )}

        {currentInvoice && (
          <div className="flex flex-col gap-3">
            {(() => {
              const adjustmentsTotal = currentInvoice.items
                .filter((item) => item.type === "CREDIT" || item.type === "DEBIT" || item.type === "ADJUSTMENT")
                .reduce((sum, item) => sum + Number(item.amount), 0);
              const paidAmount = Number(currentInvoice.paidAmount);
              const totalAmount = Number(currentInvoice.totalAmount);
              const balance = Math.max(0, Math.round((totalAmount - paidAmount) * 100) / 100);
              return (
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <span className="text-xs text-[#9A8A72] block">Mensalidade</span>
                    <span className="text-[#2E2418]">{currency(Number(currentInvoice.monthlyFee))}</span>
                  </div>
                  {adjustmentsTotal !== 0 && (
                    <div>
                      <span className="text-xs text-[#9A8A72] block">Ajustes</span>
                      <span className="text-[#2E2418]">{adjustmentsTotal > 0 ? "+" : ""}{currency(adjustmentsTotal)}</span>
                    </div>
                  )}
                  <div>
                    <span className="text-xs text-[#9A8A72] block">Total</span>
                    <span className="font-semibold text-[#2E2418]">{currency(totalAmount)}</span>
                  </div>
                  <div>
                    <span className="text-xs text-[#9A8A72] block">Pago</span>
                    <span className="text-[#2E2418]">{currency(paidAmount)}</span>
                  </div>
                  <div>
                    <span className="text-xs text-[#9A8A72] block">Saldo</span>
                    <span className="text-[#2E2418]">{currency(balance)}</span>
                  </div>
                  <div>
                    <span className="text-xs text-[#9A8A72] block">Status</span>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#1FA787]/10 text-[#1F8A6E] inline-block w-fit">
                      {INVOICE_STATUS_LABELS[effectiveStatus(currentInvoice)]}
                    </span>
                  </div>
                </div>
              );
            })()}
            <p className="text-xs text-[#9A8A72]">
              Vencimento: {new Intl.DateTimeFormat("pt-BR").format(currentInvoice.dueDate)}
            </p>

            {currentInvoice.items.length > 0 && (
              <div className="border-t border-[#ECE1CB] pt-3 flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-[#9A8A72]">Itens da cobrança</span>
                {currentInvoice.items.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm text-[#6B5D4A]">
                    <span>
                      <span className="text-xs font-semibold text-[#9A8A72]">{INVOICE_ITEM_TYPE_LABELS[item.type]}</span>{" "}
                      {item.description}
                      {item.quantity != null ? ` — ${Number(item.quantity)} min` : ""}
                    </span>
                    <span>{currency(Number(item.amount))}</span>
                  </div>
                ))}
              </div>
            )}

            {currentInvoice.payments.length > 0 && (
              <div className="border-t border-[#ECE1CB] pt-3 flex flex-col gap-1">
                <span className="text-xs font-semibold text-[#9A8A72]">Pagamentos</span>
                {currentInvoice.payments.map((p) => (
                  <div key={p.id} className="text-xs text-[#6B5D4A] flex justify-between">
                    <span>{new Intl.DateTimeFormat("pt-BR").format(p.paidAt)} {p.method ? `— ${p.method}` : ""}</span>
                    <span>{currency(Number(p.amount))}</span>
                  </div>
                ))}
              </div>
            )}

            {currentInvoice.status !== "PAID" && currentInvoice.status !== "CANCELLED" && (
              <form action={registerPaymentAction} className="flex gap-3 items-end border-t border-[#ECE1CB] pt-3">
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

            {canAdjust && (
              <form action={applyInvoiceAdjustmentAction} className="flex gap-3 items-end border-t border-[#ECE1CB] pt-3 flex-wrap">
                <input type="hidden" name="invoiceId" value={currentInvoice.id} />
                <input type="hidden" name="childId" value={childId} />
                <label className="flex flex-col gap-1 text-xs text-[#6B5D4A]">
                  Tipo
                  <select name="type" className={inputClass} defaultValue="DEBIT">
                    <option value="DEBIT">Débito (aumenta o total)</option>
                    <option value="CREDIT">Crédito (reduz o total)</option>
                    <option value="ADJUSTMENT">Ajuste</option>
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-xs text-[#6B5D4A]">
                  Descrição
                  <input name="description" placeholder="Motivo do lançamento" required className={inputClass} />
                </label>
                <label className="flex flex-col gap-1 text-xs text-[#6B5D4A]">
                  Valor
                  <input name="amount" placeholder="0,00" required className={inputClass} />
                </label>
                <button
                  type="submit"
                  className="bg-white border border-[#ECE1CB] text-[#6B5D4A] rounded-xl px-5 py-2 font-[family-name:var(--font-baloo)] font-semibold text-sm"
                >
                  Lançar ajuste
                </button>
              </form>
            )}

            {canCancel && (
              <form action={cancelInvoiceAction} className="border-t border-[#ECE1CB] pt-3">
                <input type="hidden" name="invoiceId" value={currentInvoice.id} />
                <input type="hidden" name="childId" value={childId} />
                <button type="submit" className="text-xs font-semibold text-[#B33A3A] hover:underline">
                  Cancelar esta cobrança
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
