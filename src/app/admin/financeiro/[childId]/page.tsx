import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getMonthlyOvertimeBreakdown, effectiveStatus } from "@/lib/financial";
import { INVOICE_ITEM_TYPE_LABELS, INVOICE_STATUS_LABELS, INVOICE_STATUS_TONE, MONTH_LABELS } from "@/lib/labels";
import { applyInvoiceAdjustmentAction, cancelInvoiceAction, closeMonthAction, registerPaymentAction } from "../actions";

const currency = (n: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);
const inputClass =
  "min-h-11 border border-tata-border rounded-xl px-3 py-2 text-sm outline-none focus:border-tata-green transition-colors bg-tata-surface";
const cardClass = "bg-tata-surface rounded-2xl shadow-sm p-5 flex flex-col gap-4";
const cardTitle = "font-[family-name:var(--font-baloo)] font-semibold text-base text-tata-ink";

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
      include: {
        payments: { orderBy: { paidAt: "desc" } },
        items: { orderBy: { createdAt: "asc" } },
        pixCharges: { orderBy: { createdAt: "desc" } },
      },
    }),
  ]);

  // Sem fatura fechada ainda: mostra uma estimativa recalculada ao vivo a partir da presença do mês.
  // Depois de fechada, o total e o detalhamento vêm exclusivamente dos InvoiceItems (fotografia do período).
  const livePreview = currentInvoice ? null : await getMonthlyOvertimeBreakdown(childId, month, year);

  const canAdjust = currentInvoice && currentInvoice.status !== "CANCELLED";
  const canCancel = currentInvoice && currentInvoice.status !== "CANCELLED" && Number(currentInvoice.paidAmount) === 0;

  return (
    <div className="p-4 sm:p-8 flex flex-col gap-6 max-w-3xl">
      <h1 className="font-[family-name:var(--font-baloo)] font-semibold text-xl text-tata-ink">
        Financeiro — {child.preferredName || child.fullName}
      </h1>

      <div className={cardClass}>
        <span className={cardTitle}>
          {MONTH_LABELS[month - 1]} de {year}
        </span>

        {livePreview && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
              <div>
                <span className="text-xs text-tata-ink-muted block">Mensalidade</span>
                <span className="font-semibold text-tata-ink">{currency(Number(child.monthlyFee))}</span>
              </div>
              <div>
                <span className="text-xs text-tata-ink-muted block">Horas excedentes (estimativa)</span>
                <span className="font-semibold text-tata-ink">{currency(livePreview.total)}</span>
              </div>
              <div>
                <span className="text-xs text-tata-ink-muted block">Total estimado</span>
                <span className="font-semibold text-tata-ink">
                  {currency(Number(child.monthlyFee) + livePreview.total)}
                </span>
              </div>
            </div>

            {livePreview.entries.length > 0 && (
              <div className="border-t border-tata-border pt-3 flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-tata-ink-muted">
                  Detalhamento das horas excedentes (estimativa — ainda não fechada)
                </span>
                {livePreview.entries.map((e, i) => (
                  <div key={i} className="flex justify-between text-sm text-tata-ink-soft">
                    <span>{new Intl.DateTimeFormat("pt-BR").format(e.date)} — {e.minutesLate} min</span>
                    <span>{currency(e.amount)}</span>
                  </div>
                ))}
              </div>
            )}

            <form action={closeMonthAction} className="flex flex-wrap gap-3 items-end border-t border-tata-border pt-3">
              <input type="hidden" name="childId" value={childId} />
              <input type="hidden" name="month" value={month} />
              <input type="hidden" name="year" value={year} />
              <label className="flex flex-col gap-1 text-xs text-tata-ink-soft">
                Descontos
                <input name="discounts" placeholder="0,00" className={inputClass} />
              </label>
              <label className="flex flex-col gap-1 text-xs text-tata-ink-soft">
                Outros
                <input name="otherCharges" placeholder="0,00" className={inputClass} />
              </label>
              <button
                type="submit"
                className="min-h-11 bg-tata-coral text-white rounded-xl px-5 py-2 font-[family-name:var(--font-baloo)] font-semibold text-sm"
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
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                  <div>
                    <span className="text-xs text-tata-ink-muted block">Mensalidade</span>
                    <span className="text-tata-ink">{currency(Number(currentInvoice.monthlyFee))}</span>
                  </div>
                  {adjustmentsTotal !== 0 && (
                    <div>
                      <span className="text-xs text-tata-ink-muted block">Ajustes</span>
                      <span className="text-tata-ink">{adjustmentsTotal > 0 ? "+" : ""}{currency(adjustmentsTotal)}</span>
                    </div>
                  )}
                  <div>
                    <span className="text-xs text-tata-ink-muted block">Total</span>
                    <span className="font-semibold text-tata-ink">{currency(totalAmount)}</span>
                  </div>
                  <div>
                    <span className="text-xs text-tata-ink-muted block">Pago</span>
                    <span className="text-tata-ink">{currency(paidAmount)}</span>
                  </div>
                  <div>
                    <span className="text-xs text-tata-ink-muted block">Saldo</span>
                    <span className="text-tata-ink">{currency(balance)}</span>
                  </div>
                  <div>
                    <span className="text-xs text-tata-ink-muted block">Status</span>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full inline-block w-fit ${INVOICE_STATUS_TONE[effectiveStatus(currentInvoice)]}`}>
                      {INVOICE_STATUS_LABELS[effectiveStatus(currentInvoice)]}
                    </span>
                  </div>
                </div>
              );
            })()}
            <p className="text-xs text-tata-ink-muted">
              Vencimento: {new Intl.DateTimeFormat("pt-BR").format(currentInvoice.dueDate)}
            </p>

            {currentInvoice.items.length > 0 && (
              <div className="border-t border-tata-border pt-3 flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-tata-ink-muted">Itens da cobrança</span>
                {currentInvoice.items.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm text-tata-ink-soft">
                    <span>
                      <span className="text-xs font-semibold text-tata-ink-muted">{INVOICE_ITEM_TYPE_LABELS[item.type]}</span>{" "}
                      {item.description}
                      {item.quantity != null ? ` — ${Number(item.quantity)} min` : ""}
                    </span>
                    <span>{currency(Number(item.amount))}</span>
                  </div>
                ))}
              </div>
            )}

            {currentInvoice.payments.length > 0 && (
              <div className="border-t border-tata-border pt-3 flex flex-col gap-1">
                <span className="text-xs font-semibold text-tata-ink-muted">Pagamentos</span>
                {currentInvoice.payments.map((p) => (
                  <div key={p.id} className="text-xs text-tata-ink-soft flex justify-between">
                    <span>{new Intl.DateTimeFormat("pt-BR").format(p.paidAt)} {p.method ? `— ${p.method}` : ""}</span>
                    <span>{currency(Number(p.amount))}</span>
                  </div>
                ))}
              </div>
            )}

            {currentInvoice.pixCharges.length > 0 && (
              <div className="border-t border-tata-border pt-3 flex flex-col gap-1">
                <span className="text-xs font-semibold text-tata-ink-muted">Cobranças Pix</span>
                {currentInvoice.pixCharges.map((charge) => (
                  <div key={charge.id} className="text-xs text-tata-ink-soft flex justify-between items-center">
                    <span>
                      {new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(charge.createdAt)}
                      {" — "}
                      {charge.status === "approved" ? "✓ Pago" : charge.status === "pending" ? "Aguardando pagamento" : charge.status}
                    </span>
                    <span>{currency(Number(charge.amount))}</span>
                  </div>
                ))}
              </div>
            )}

            {currentInvoice.status !== "PAID" && currentInvoice.status !== "CANCELLED" && (
              <form action={registerPaymentAction} className="flex flex-wrap gap-3 items-end border-t border-tata-border pt-3">
                <input type="hidden" name="invoiceId" value={currentInvoice.id} />
                <input type="hidden" name="childId" value={childId} />
                <label className="flex flex-col gap-1 text-xs text-tata-ink-soft">
                  Valor
                  <input name="amount" placeholder="0,00" required className={inputClass} />
                </label>
                <label className="flex flex-col gap-1 text-xs text-tata-ink-soft">
                  Forma
                  <input name="method" placeholder="Pix, cartão..." className={inputClass} />
                </label>
                <button
                  type="submit"
                  className="min-h-11 bg-tata-green text-white rounded-xl px-5 py-2 font-[family-name:var(--font-baloo)] font-semibold text-sm"
                >
                  Registrar pagamento
                </button>
              </form>
            )}

            {canAdjust && (
              <form action={applyInvoiceAdjustmentAction} className="flex gap-3 items-end border-t border-tata-border pt-3 flex-wrap">
                <input type="hidden" name="invoiceId" value={currentInvoice.id} />
                <input type="hidden" name="childId" value={childId} />
                <label className="flex flex-col gap-1 text-xs text-tata-ink-soft">
                  Tipo
                  <select name="type" className={inputClass} defaultValue="DEBIT">
                    <option value="DEBIT">Débito (aumenta o total)</option>
                    <option value="CREDIT">Crédito (reduz o total)</option>
                    <option value="ADJUSTMENT">Ajuste</option>
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-xs text-tata-ink-soft">
                  Descrição
                  <input name="description" placeholder="Motivo do lançamento" required className={inputClass} />
                </label>
                <label className="flex flex-col gap-1 text-xs text-tata-ink-soft">
                  Valor
                  <input name="amount" placeholder="0,00" required className={inputClass} />
                </label>
                <button
                  type="submit"
                  className="min-h-11 bg-tata-surface border border-tata-border text-tata-ink-soft rounded-xl px-5 py-2 font-[family-name:var(--font-baloo)] font-semibold text-sm"
                >
                  Lançar ajuste
                </button>
              </form>
            )}

            {canCancel && (
              <form action={cancelInvoiceAction} className="border-t border-tata-border pt-3">
                <input type="hidden" name="invoiceId" value={currentInvoice.id} />
                <input type="hidden" name="childId" value={childId} />
                <button type="submit" className="text-xs font-semibold text-tata-red hover:underline">
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
          <p className="text-sm text-tata-ink-muted-alt">Nenhum mês fechado ainda.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {invoices.map((inv) => (
              <li key={inv.id} className="flex items-center justify-between text-sm border-b border-tata-surface-hover pb-2 last:border-0">
                <span className="text-tata-ink">
                  {MONTH_LABELS[inv.referenceMonth - 1]} de {inv.referenceYear}
                </span>
                <span className="text-tata-ink-soft">{currency(Number(inv.totalAmount))}</span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${INVOICE_STATUS_TONE[effectiveStatus(inv)]}`}>
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
