import type { InvoiceItem, InvoiceStatus, MonthlyInvoice } from "@prisma/client";
import { effectiveStatus } from "@/lib/financial";
import { INVOICE_ITEM_TYPE_LABELS, INVOICE_STATUS_LABELS, MONTH_LABELS } from "@/lib/labels";
import { Card } from "@/components/tata/Card";
import { PixPaymentButton } from "./PixPaymentButton";

const currency = (n: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);

const STATUS_STYLE: Record<InvoiceStatus, { icon: string; className: string }> = {
  PAID: { icon: "🟢", className: "bg-tata-green/10 text-tata-green-dark" },
  PENDING: { icon: "🟡", className: "bg-tata-yellow/15 text-tata-yellow-dark" },
  PARTIALLY_PAID: { icon: "🟡", className: "bg-tata-yellow/15 text-tata-yellow-dark" },
  OVERDUE: { icon: "🔴", className: "bg-tata-coral-dark/10 text-tata-coral-deep" },
  CANCELLED: { icon: "⚪", className: "bg-tata-ink-muted/10 text-tata-ink-muted-alt" },
};

type Invoice = MonthlyInvoice & { items: InvoiceItem[] };

export function FinanceCard({
  invoice,
  delayMs = 0,
  pixEnabled = false,
}: {
  invoice: Invoice;
  delayMs?: number;
  pixEnabled?: boolean;
}) {
  const overtimeItems = invoice.items.filter((item) => item.type === "OVERTIME");
  const otherItems = invoice.items.filter((item) => item.type !== "OVERTIME" && item.type !== "MONTHLY_FEE");
  const status = effectiveStatus(invoice);
  const statusStyle = STATUS_STYLE[status] ?? STATUS_STYLE.PENDING;
  const payable = status === "PENDING" || status === "OVERDUE" || status === "PARTIALLY_PAID";

  return (
    <Card animate style={{ animationDelay: `${delayMs}ms` }}>
      <div className="flex items-center justify-between gap-2">
        <span className="font-[family-name:var(--font-baloo)] font-semibold text-sm text-tata-ink">
          Mensalidade de {MONTH_LABELS[invoice.referenceMonth - 1]}
        </span>
        <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${statusStyle.className}`}>
          <span aria-hidden="true">{statusStyle.icon}</span>
          {INVOICE_STATUS_LABELS[status]}
        </span>
      </div>
      {status === "OVERDUE" && (
        <p className="text-xs text-tata-coral-deep font-medium mt-1">Esta mensalidade está vencida.</p>
      )}

      <div className="grid grid-cols-3 gap-2 mt-3 text-sm">
        <div>
          <span className="text-xs text-tata-ink-muted block">Mensalidade</span>
          <span className="text-tata-ink">{currency(Number(invoice.monthlyFee))}</span>
        </div>
        <div>
          <span className="text-xs text-tata-ink-muted block">Horas excedentes</span>
          <span className="text-tata-ink">{currency(Number(invoice.overtimeTotal))}</span>
        </div>
        <div>
          <span className="text-xs text-tata-ink-muted block">Total</span>
          <span className="font-semibold text-tata-ink">{currency(Number(invoice.totalAmount))}</span>
        </div>
        <div>
          <span className="text-xs text-tata-ink-muted block">Pago</span>
          <span className="text-tata-ink">{currency(Number(invoice.paidAmount))}</span>
        </div>
        <div>
          <span className="text-xs text-tata-ink-muted block">Saldo</span>
          <span className="text-tata-ink">
            {currency(Math.max(0, Math.round((Number(invoice.totalAmount) - Number(invoice.paidAmount)) * 100) / 100))}
          </span>
        </div>
      </div>

      {overtimeItems.length > 0 && (
        <details className="mt-3">
          <summary className="text-xs font-semibold text-tata-green cursor-pointer">Horas excedentes</summary>
          <div className="flex flex-col gap-1 mt-2">
            {overtimeItems.map((item) => (
              <div key={item.id} className="flex justify-between text-xs text-tata-ink-soft">
                <span>{item.description}{item.quantity != null ? ` — ${Number(item.quantity)} min` : ""}</span>
                <span>{currency(Number(item.amount))}</span>
              </div>
            ))}
          </div>
        </details>
      )}

      {otherItems.length > 0 && (
        <div className="flex flex-col gap-1 mt-2">
          {otherItems.map((item) => (
            <div key={item.id} className="flex justify-between text-xs text-tata-ink-soft">
              <span>
                <span className="font-semibold text-tata-ink-muted">{INVOICE_ITEM_TYPE_LABELS[item.type]}</span>{" "}
                {item.description}
              </span>
              <span>{currency(Number(item.amount))}</span>
            </div>
          ))}
        </div>
      )}

      {pixEnabled && payable && (
        <div className="mt-3">
          <PixPaymentButton invoiceId={invoice.id} childId={invoice.childId} />
        </div>
      )}
    </Card>
  );
}
