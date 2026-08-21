"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { closeMonth } from "@/lib/financial";
import { notifyGuardians } from "@/lib/notifications";
import { MONTH_LABELS } from "@/lib/labels";

export async function closeMonthAction(formData: FormData) {
  const childId = String(formData.get("childId") ?? "");
  const month = Number(formData.get("month"));
  const year = Number(formData.get("year"));
  const discounts = Number(String(formData.get("discounts") ?? "0").replace(",", ".")) || 0;
  const otherCharges = Number(String(formData.get("otherCharges") ?? "0").replace(",", ".")) || 0;

  const invoice = await closeMonth(childId, month, year, discounts, otherCharges);

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
  const session = await auth();
  if (!session?.user) throw new Error("Não autenticado.");

  const invoiceId = String(formData.get("invoiceId") ?? "");
  const childId = String(formData.get("childId") ?? "");
  const amount = Number(String(formData.get("amount") ?? "0").replace(",", "."));
  const method = String(formData.get("method") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  if (!invoiceId || amount <= 0) throw new Error("Valor de pagamento inválido.");

  const invoice = await prisma.monthlyInvoice.findUniqueOrThrow({ where: { id: invoiceId } });

  await prisma.payment.create({
    data: { invoiceId, amount, method: method || null, notes: notes || null, recordedById: session.user.id },
  });

  const newPaidAmount = Number(invoice.paidAmount) + amount;
  const status =
    newPaidAmount >= Number(invoice.totalAmount)
      ? "PAID"
      : newPaidAmount > 0
        ? "PARTIALLY_PAID"
        : invoice.status;

  await prisma.monthlyInvoice.update({
    where: { id: invoiceId },
    data: { paidAmount: newPaidAmount, status },
  });

  revalidatePath(`/admin/financeiro/${childId}`);
  revalidatePath("/admin/financeiro");
}
