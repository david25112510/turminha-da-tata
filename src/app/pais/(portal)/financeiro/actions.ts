"use server";

import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { requireGuardianChildPermission } from "@/lib/authz";
import { createPixCharge, isMercadoPagoConfigured } from "@/lib/mercadopago";
import { effectiveStatus } from "@/lib/financial";
import { recordAuditLog } from "@/lib/audit-log";
import { MONTH_LABELS } from "@/lib/labels";

export type PixChargeState = { qrCode: string; qrCodeText: string; expiresAt: string } | { error: string } | undefined;

/**
 * Gera (ou reaproveita) uma cobrança Pix para a fatura informada. Idempotente: se já existir uma
 * PixCharge "pending" ainda não expirada para essa fatura, devolve ela em vez de criar outra no
 * Mercado Pago — evita cobranças duplicadas em cliques repetidos ou duas abas abertas (mesmo
 * raciocínio de acceptContractAction). A confirmação do pagamento nunca acontece aqui — só o
 * webhook (src/app/api/webhooks/mercadopago/route.ts) credita a fatura.
 */
export async function generatePixChargeAction(_prevState: PixChargeState, formData: FormData): Promise<PixChargeState> {
  const invoiceId = String(formData.get("invoiceId") ?? "");
  const childId = String(formData.get("childId") ?? "");
  if (!invoiceId || !childId) return { error: "Cobrança inválida." };

  if (!isMercadoPagoConfigured()) return { error: "Pagamento via Pix está temporariamente indisponível." };

  const { user, guardian } = await requireGuardianChildPermission(childId, "viewFinancial");
  if (!guardian.email) {
    return { error: "Cadastre um e-mail no seu perfil para gerar cobranças Pix." };
  }

  const invoice = await prisma.monthlyInvoice.findUnique({ where: { id: invoiceId } });
  if (!invoice || invoice.childId !== childId) return { error: "Cobrança não encontrada." };

  const status = effectiveStatus(invoice);
  if (status === "PAID" || status === "CANCELLED") {
    return { error: "Esta cobrança não está mais em aberto." };
  }

  const remaining = Math.round((Number(invoice.totalAmount) - Number(invoice.paidAmount)) * 100) / 100;
  if (remaining <= 0) return { error: "Esta cobrança não está mais em aberto." };

  const existing = await prisma.pixCharge.findFirst({
    where: { invoiceId, status: "pending", expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (existing) {
    return {
      qrCode: existing.qrCode,
      qrCodeText: existing.qrCodeText,
      expiresAt: existing.expiresAt.toISOString(),
    };
  }

  let charge;
  try {
    charge = await createPixCharge({
      amount: remaining,
      description: `Mensalidade de ${MONTH_LABELS[invoice.referenceMonth - 1]} — Turminha da Tata`,
      externalReference: invoice.id,
      payerEmail: guardian.email,
      payerFirstName: guardian.name.split(" ")[0],
      payerLastName: guardian.name.split(" ").slice(1).join(" ") || undefined,
      idempotencyKey: randomUUID(),
    });
  } catch {
    return { error: "Não foi possível gerar a cobrança Pix agora. Tente novamente em instantes." };
  }

  const created = await prisma.pixCharge.create({
    data: {
      invoiceId,
      externalPaymentId: charge.externalPaymentId,
      initiatedByUserId: user.id,
      status: "pending",
      amount: remaining,
      qrCode: charge.qrCode,
      qrCodeText: charge.qrCodeText,
      expiresAt: charge.expiresAt,
    },
  });

  await recordAuditLog({
    actorUserId: user.id,
    action: "CREATE",
    entity: "PixCharge",
    entityId: created.id,
    newData: { invoiceId, childId, amount: remaining, externalPaymentId: charge.externalPaymentId },
  });

  return { qrCode: charge.qrCode, qrCodeText: charge.qrCodeText, expiresAt: charge.expiresAt.toISOString() };
}
