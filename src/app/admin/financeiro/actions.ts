"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { applyInvoiceAdjustment, cancelInvoice, closeMonth } from "@/lib/financial";
import { notifyGuardians } from "@/lib/notifications";
import { MONTH_LABELS } from "@/lib/labels";
import { requireAdmin } from "@/lib/authz";
import { recordAuditLog } from "@/lib/audit-log";
import type { InvoiceItemType } from "@prisma/client";

export async function closeMonthAction(formData: FormData) {
  const admin = await requireAdmin();
  const childId = String(formData.get("childId") ?? "");
  const month = Number(formData.get("month"));
  const year = Number(formData.get("year"));
  const discounts = Number(String(formData.get("discounts") ?? "0").replace(",", ".")) || 0;
  const otherCharges = Number(String(formData.get("otherCharges") ?? "0").replace(",", ".")) || 0;

  if (!childId || !Number.isInteger(month) || month < 1 || month > 12 || !Number.isInteger(year) || year < 2020 || year > 2100) {
    throw new Error("Período ou criança inválidos.");
  }
  if (discounts < 0 || otherCharges < 0) throw new Error("Valores financeiros não podem ser negativos.");

  const child = await prisma.child.findUnique({ where: { id: childId } });
  if (!child || child.status !== "ACTIVE") throw new Error("Criança não encontrada ou inativa.");

  const invoice = await closeMonth(childId, month, year, discounts, otherCharges);

  await recordAuditLog({
    actorUserId: admin.id,
    action: "CLOSE_MONTH",
    entity: "MonthlyInvoice",
    entityId: invoice.id,
    newData: {
      childId,
      referenceMonth: month,
      referenceYear: year,
      totalAmount: Number(invoice.totalAmount),
      overtimeTotal: Number(invoice.overtimeTotal),
      discounts,
      otherCharges,
    },
  });

  const currency = (n: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);
  await notifyGuardians(
    childId,
    "FINANCIAL",
    "Mensalidade disponível",
    `A mensalidade de ${MONTH_LABELS[month - 1]} já está disponível: ${currency(Number(invoice.totalAmount))}.`,
    "viewFinancial"
  );

  revalidatePath("/admin/financeiro");
  revalidatePath(`/admin/financeiro/${childId}`);
}

export async function registerPaymentAction(formData: FormData) {
  const admin = await requireAdmin();

  const invoiceId = String(formData.get("invoiceId") ?? "");
  const childId = String(formData.get("childId") ?? "");
  const amount = Number(String(formData.get("amount") ?? "0").replace(",", "."));
  const method = String(formData.get("method") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  if (!invoiceId || !childId || !Number.isFinite(amount) || amount <= 0) throw new Error("Valor de pagamento inválido.");

  // Lê, valida e escreve dentro da mesma transação: evita a janela de corrida entre checar o saldo e gravar.
  const { payment, oldPaidAmount, oldStatus, newPaidAmount, status } = await prisma.$transaction(async (tx) => {
    const invoice = await tx.monthlyInvoice.findUnique({ where: { id: invoiceId } });
    if (!invoice || invoice.childId !== childId) throw new Error("Cobrança não encontrada para esta criança.");
    if (invoice.status === "CANCELLED") throw new Error("Não é possível registrar pagamento em cobrança cancelada.");

    const remaining = Number(invoice.totalAmount) - Number(invoice.paidAmount);
    if (amount > remaining + 0.009) throw new Error("O pagamento não pode exceder o saldo da cobrança.");

    const payment = await tx.payment.create({
      data: { invoiceId, amount, method: method || null, notes: notes || null, recordedById: admin.id },
    });

    const newPaidAmount = Number(invoice.paidAmount) + amount;
    const status = newPaidAmount >= Number(invoice.totalAmount) ? "PAID" : "PARTIALLY_PAID";

    await tx.monthlyInvoice.update({
      where: { id: invoiceId },
      data: { paidAmount: newPaidAmount, status },
    });

    return { payment, oldPaidAmount: Number(invoice.paidAmount), oldStatus: invoice.status, newPaidAmount, status };
  });

  await recordAuditLog({
    actorUserId: admin.id,
    action: "CREATE",
    entity: "Payment",
    entityId: payment.id,
    oldData: { paidAmount: oldPaidAmount, status: oldStatus },
    newData: { childId, paidAmount: newPaidAmount, status, amount, method: method || null },
  });

  revalidatePath(`/admin/financeiro/${childId}`);
  revalidatePath("/admin/financeiro");
}

export async function applyInvoiceAdjustmentAction(formData: FormData) {
  const admin = await requireAdmin();

  const invoiceId = String(formData.get("invoiceId") ?? "");
  const childId = String(formData.get("childId") ?? "");
  const type = String(formData.get("type") ?? "") as InvoiceItemType;
  const description = String(formData.get("description") ?? "").trim();
  const amount = Number(String(formData.get("amount") ?? "0").replace(",", "."));

  if (!invoiceId || !childId) throw new Error("Cobrança inválida.");
  if (type !== "CREDIT" && type !== "DEBIT" && type !== "ADJUSTMENT") throw new Error("Tipo de ajuste inválido.");
  if (!description) throw new Error("Descrição do ajuste é obrigatória.");
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("Valor do ajuste deve ser positivo.");

  const before = await prisma.monthlyInvoice.findUnique({ where: { id: invoiceId } });
  if (!before || before.childId !== childId) throw new Error("Cobrança não encontrada para esta criança.");

  const updated = await applyInvoiceAdjustment(invoiceId, type, description, amount);

  await recordAuditLog({
    actorUserId: admin.id,
    action: "ADJUSTMENT",
    entity: "MonthlyInvoice",
    entityId: invoiceId,
    oldData: { childId, totalAmount: Number(before.totalAmount), status: before.status },
    newData: { childId, type, description, amount, totalAmount: Number(updated.totalAmount), status: updated.status },
  });

  revalidatePath(`/admin/financeiro/${childId}`);
  revalidatePath("/admin/financeiro");
}

export async function cancelInvoiceAction(formData: FormData) {
  const admin = await requireAdmin();

  const invoiceId = String(formData.get("invoiceId") ?? "");
  const childId = String(formData.get("childId") ?? "");
  if (!invoiceId || !childId) throw new Error("Cobrança inválida.");

  const before = await prisma.monthlyInvoice.findUnique({ where: { id: invoiceId } });
  if (!before || before.childId !== childId) throw new Error("Cobrança não encontrada para esta criança.");

  await cancelInvoice(invoiceId);

  await recordAuditLog({
    actorUserId: admin.id,
    action: "CANCEL",
    entity: "MonthlyInvoice",
    entityId: invoiceId,
    oldData: { childId, status: before.status },
    newData: { childId, status: "CANCELLED" },
  });

  revalidatePath(`/admin/financeiro/${childId}`);
  revalidatePath("/admin/financeiro");
}
