import { prisma } from "@/lib/prisma";
import type { InvoiceItemType, InvoiceStatus, MonthlyInvoice } from "@prisma/client";
import { MONTH_LABELS } from "@/lib/labels";

/** Converts a currency value (reais) to integer cents — avoids compounding floating-point error across sums. */
function toCents(value: number): number {
  return Math.round(value * 100);
}

/**
 * Minutos cobráveis de excedente: excedente bruto (saída real - horário contratado) menos a tolerância,
 * nunca negativo. A tolerância é um desconto sobre o atraso, não um limiar de tudo-ou-nada — sair 1 minuto
 * além da tolerância cobra 1 minuto, não o atraso inteiro.
 */
export function calculateOvertimeMinutes(
  checkOutTime: Date,
  contractedExitTime: string,
  toleranceMinutes: number
): number {
  const [hours, minutes] = contractedExitTime.split(":").map(Number);
  const expected = new Date(checkOutTime);
  expected.setHours(hours, minutes, 0, 0);

  const grossExcessMinutes = Math.max(0, Math.round((checkOutTime.getTime() - expected.getTime()) / 60000));
  return Math.max(0, grossExcessMinutes - toleranceMinutes);
}

/** Valor em reais para os minutos cobráveis, arredondando uma única vez (em centavos) para evitar erro de ponto flutuante. */
export function calculateOvertimeAmount(billableMinutes: number, overtimeHourRate: number): number {
  if (billableMinutes <= 0) return 0;
  const amountCents = Math.round((billableMinutes * toCents(overtimeHourRate)) / 60);
  return amountCents / 100;
}

export function calculateOvertimeForAttendance(
  checkOutTime: Date,
  contractedExitTime: string,
  toleranceMinutes: number,
  overtimeHourRate: number
): { minutesLate: number; amount: number } {
  const minutesLate = calculateOvertimeMinutes(checkOutTime, contractedExitTime, toleranceMinutes);
  const amount = calculateOvertimeAmount(minutesLate, overtimeHourRate);
  return { minutesLate, amount };
}

export type OvertimeEntry = { date: Date; minutesLate: number; amount: number };

/**
 * Detalhamento de excedente do mês. Se já existe uma MonthlyInvoice para o período, os dados vêm do
 * snapshot congelado em closeMonth (InvoiceItem tipo OVERTIME) — não recalcula ao vivo a partir de
 * Attendance, para nunca divergir do que está na fatura (ver closeMonth). Só recalcula ao vivo
 * quando ainda não existe fatura para o período (mês corrente/aberto).
 */
export async function getMonthlyOvertimeBreakdown(childId: string, month: number, year: number) {
  const invoice = await prisma.monthlyInvoice.findUnique({
    where: { childId_referenceMonth_referenceYear: { childId, referenceMonth: month, referenceYear: year } },
    include: { items: { where: { type: "OVERTIME" } } },
  });

  if (invoice) {
    const entries: OvertimeEntry[] = invoice.items.map((item) => {
      const metadata = item.metadata as { date?: string } | null;
      return {
        date: metadata?.date ? new Date(metadata.date) : invoice.createdAt,
        minutesLate: Number(item.quantity ?? 0),
        amount: Number(item.amount),
      };
    });
    const total = Math.round(entries.reduce((sum, e) => sum + e.amount, 0) * 100) / 100;
    return { entries, total };
  }

  const child = await prisma.child.findUniqueOrThrow({ where: { id: childId } });
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1);

  const attendances = await prisma.attendance.findMany({
    where: { childId, date: { gte: start, lt: end }, checkOutTime: { not: null } },
    orderBy: { date: "asc" },
  });

  const overtimeRate = Number(child.overtimeHourRate);
  const entries: OvertimeEntry[] = attendances
    .map((a) => {
      const { minutesLate, amount } = calculateOvertimeForAttendance(
        a.checkOutTime!,
        child.contractedExitTime,
        child.toleranceMinutes,
        overtimeRate
      );
      return { date: a.date, minutesLate, amount };
    })
    .filter((e) => e.minutesLate > 0);

  const total = Math.round(entries.reduce((sum, e) => sum + e.amount, 0) * 100) / 100;
  return { entries, total };
}

const IMMUTABLE_INVOICE_STATUSES = new Set(["PAID", "PARTIALLY_PAID", "CANCELLED"]);

type InvoiceItemInput = {
  invoiceId: string;
  type: InvoiceItemType;
  description: string;
  quantity?: number;
  unitPrice?: number;
  amount: number;
  metadata?: { date: string };
};

/**
 * Fecha (ou refecha, enquanto aberta) a mensalidade de uma criança para um período, gerando os InvoiceItems
 * que sustentam o total — a fatura deixa de depender de recalcular Attendance indefinidamente uma vez fechada.
 *
 * Idempotente: reexecutar sobre uma invoice ainda aberta (PENDING/OVERDUE) substitui o conjunto de itens
 * inteiro (delete + create na mesma transação) em vez de acumular — nunca duplica MONTHLY_FEE/OVERTIME.
 * Uma invoice PAID/PARTIALLY_PAID/CANCELLED é imutável: recalcular é recusado (ver seção "cobrança paga").
 */
export async function closeMonth(
  childId: string,
  month: number,
  year: number,
  discounts = 0,
  otherCharges = 0
) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.monthlyInvoice.findUnique({
      where: { childId_referenceMonth_referenceYear: { childId, referenceMonth: month, referenceYear: year } },
    });
    if (existing && IMMUTABLE_INVOICE_STATUSES.has(existing.status)) {
      throw new Error("Esta cobrança já foi paga ou cancelada e não pode ser recalculada.");
    }

    const child = await tx.child.findUniqueOrThrow({ where: { id: childId } });
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 1);
    const attendances = await tx.attendance.findMany({
      where: { childId, date: { gte: start, lt: end }, checkOutTime: { not: null } },
      orderBy: { date: "asc" },
    });

    const overtimeRate = Number(child.overtimeHourRate);
    const overtimeEntries = attendances
      .map((a) => {
        const minutesLate = calculateOvertimeMinutes(a.checkOutTime!, child.contractedExitTime, child.toleranceMinutes);
        const amount = calculateOvertimeAmount(minutesLate, overtimeRate);
        return { date: a.date, minutesLate, amount };
      })
      .filter((e) => e.minutesLate > 0);

    const monthlyFee = Number(child.monthlyFee);
    const overtimeTotalCents = overtimeEntries.reduce((sum, e) => sum + toCents(e.amount), 0);
    const totalCents = toCents(monthlyFee) + overtimeTotalCents + toCents(otherCharges) - toCents(discounts);
    const overtimeTotal = overtimeTotalCents / 100;
    const totalAmount = totalCents / 100;
    const dueDate = new Date(year, month, child.dueDay);

    const invoice = await tx.monthlyInvoice.upsert({
      where: { childId_referenceMonth_referenceYear: { childId, referenceMonth: month, referenceYear: year } },
      create: { childId, referenceMonth: month, referenceYear: year, monthlyFee, overtimeTotal, discounts, otherCharges, totalAmount, dueDate },
      update: { monthlyFee, overtimeTotal, discounts, otherCharges, totalAmount, dueDate },
    });

    // Idempotência: substitui o conjunto de itens em vez de acrescentar — reexecutar não duplica.
    await tx.invoiceItem.deleteMany({ where: { invoiceId: invoice.id } });

    const items: InvoiceItemInput[] = [
      {
        invoiceId: invoice.id,
        type: "MONTHLY_FEE",
        description: `Mensalidade ${MONTH_LABELS[month - 1]}/${year}`,
        amount: monthlyFee,
      },
      ...overtimeEntries.map((e) => ({
        invoiceId: invoice.id,
        type: "OVERTIME" as const,
        description: `Excedente em ${new Intl.DateTimeFormat("pt-BR").format(e.date)}`,
        quantity: e.minutesLate,
        unitPrice: overtimeRate,
        amount: e.amount,
        // Data original do excedente, para getMonthlyOvertimeBreakdown reconstruir o detalhamento a
        // partir do snapshot sem precisar re-parsear a description formatada em pt-BR.
        metadata: { date: e.date.toISOString() },
      })),
    ];
    if (discounts > 0) {
      items.push({ invoiceId: invoice.id, type: "DISCOUNT", description: "Desconto acordado", amount: -discounts });
    }
    if (otherCharges > 0) {
      items.push({ invoiceId: invoice.id, type: "OTHER", description: "Outros lançamentos", amount: otherCharges });
    }

    await tx.invoiceItem.createMany({ data: items });

    return tx.monthlyInvoice.findUniqueOrThrow({ where: { id: invoice.id }, include: { items: true } });
  });
}

/**
 * Registra um lançamento posterior (CREDIT/DEBIT/ADJUSTMENT) sobre uma invoice já existente, incluindo uma
 * já PAID. Nunca reescreve os itens originais (mensalidade/excedente já cobrados ficam intactos) — apenas
 * acrescenta um novo InvoiceItem rastreável e recalcula o total e o status a partir da soma de todos os itens.
 * Uma invoice CANCELLED não aceita lançamentos.
 */
export async function applyInvoiceAdjustment(
  invoiceId: string,
  type: Extract<InvoiceItemType, "CREDIT" | "DEBIT" | "ADJUSTMENT">,
  description: string,
  amount: number
) {
  if (!description.trim()) throw new Error("Descrição do ajuste é obrigatória.");
  if (!Number.isFinite(amount) || amount === 0) throw new Error("Valor do ajuste inválido.");

  return prisma.$transaction(async (tx) => {
    const invoice = await tx.monthlyInvoice.findUnique({ where: { id: invoiceId }, include: { items: true } });
    if (!invoice) throw new Error("Cobrança não encontrada.");
    if (invoice.status === "CANCELLED") throw new Error("Não é possível lançar ajustes em uma cobrança cancelada.");

    // CREDIT reduz o que é devido, DEBIT/ADJUSTMENT aumentam.
    const signedAmount = type === "CREDIT" ? -Math.abs(amount) : Math.abs(amount);

    await tx.invoiceItem.create({
      data: { invoiceId, type, description, amount: signedAmount },
    });

    const existingItemsCents = invoice.items.reduce((sum, item) => sum + toCents(Number(item.amount)), 0);
    const totalCents = existingItemsCents + toCents(signedAmount);
    const totalAmount = totalCents / 100;
    const paidAmount = Number(invoice.paidAmount);
    const status: InvoiceStatus = paidAmount <= 0 ? "PENDING" : paidAmount >= totalAmount ? "PAID" : "PARTIALLY_PAID";

    return tx.monthlyInvoice.update({
      where: { id: invoiceId },
      data: { totalAmount, status },
      include: { items: true },
    });
  });
}

/**
 * Cancela uma cobrança (torna-se imutável). Só permitido quando nada foi pago ainda — cancelar uma invoice
 * com pagamentos registrados exigiria um fluxo de estorno, fora do escopo desta função.
 */
export async function cancelInvoice(invoiceId: string) {
  const invoice = await prisma.monthlyInvoice.findUnique({ where: { id: invoiceId } });
  if (!invoice) throw new Error("Cobrança não encontrada.");
  if (invoice.status === "CANCELLED") throw new Error("Esta cobrança já está cancelada.");
  if (Number(invoice.paidAmount) > 0) {
    throw new Error("Não é possível cancelar uma cobrança com pagamentos registrados. Registre um estorno (CREDIT) em vez disso.");
  }

  return prisma.monthlyInvoice.update({ where: { id: invoiceId }, data: { status: "CANCELLED" } });
}

export function effectiveStatus(invoice: Pick<MonthlyInvoice, "status" | "dueDate">): InvoiceStatus {
  if (
    (invoice.status === "PENDING" || invoice.status === "PARTIALLY_PAID") &&
    invoice.dueDate.getTime() < Date.now()
  ) {
    return "OVERDUE";
  }
  return invoice.status;
}
