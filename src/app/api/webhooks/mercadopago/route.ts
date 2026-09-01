import { prisma } from "@/lib/prisma";
import { getPayment, verifyMercadoPagoSignature } from "@/lib/mercadopago";
import { recordAuditLog } from "@/lib/audit-log";
import { notifyGuardians } from "@/lib/notifications";

/**
 * Webhook do Mercado Pago — única fonte de verdade para confirmar um pagamento Pix (nunca o
 * cliente, que só mostra o QR code e espera). Usa Request/Response nativos (não NextRequest/
 * NextResponse) para não puxar "next/server" na cadeia de import — o mesmo motivo que faz
 * src/app/login/actions.test.ts mockar "next-auth" inteiro, ver comentário lá.
 */
export async function POST(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const body = await request.json().catch(() => null);

  const type = body?.type ?? body?.topic ?? url.searchParams.get("type");
  const dataId = body?.data?.id ?? url.searchParams.get("data.id") ?? url.searchParams.get("id");

  if (type !== "payment" || !dataId) {
    return Response.json({ ok: true });
  }

  const secret = process.env.MERCADO_PAGO_WEBHOOK_SECRET;
  if (secret) {
    const verified = verifyMercadoPagoSignature({
      xSignature: request.headers.get("x-signature"),
      xRequestId: request.headers.get("x-request-id"),
      dataId: String(dataId),
      secret,
    });
    if (!verified) {
      console.warn("[webhook mercadopago] assinatura inválida, notificação recusada");
      return Response.json({ error: "Assinatura inválida." }, { status: 401 });
    }
  }

  let payment;
  try {
    payment = await getPayment(String(dataId));
  } catch (error) {
    console.error("[webhook mercadopago] falha ao consultar pagamento:", error);
    return Response.json({ error: "Falha ao consultar pagamento." }, { status: 502 });
  }

  if (payment.status !== "approved") {
    return Response.json({ ok: true });
  }

  const charge = await prisma.pixCharge.findUnique({ where: { externalPaymentId: String(dataId) } });
  if (!charge) return Response.json({ ok: true }); // notificação de um pagamento que não é nosso (ou já removido)
  if (charge.status === "approved") return Response.json({ ok: true }); // idempotência: reenvio do mesmo evento

  const result = await prisma.$transaction(async (tx) => {
    const invoice = await tx.monthlyInvoice.findUnique({ where: { id: charge.invoiceId } });
    if (!invoice || invoice.status === "CANCELLED") return null;

    // Faz a transição de pending -> processing dentro da mesma transação. Entregas simultâneas do
    // mesmo webhook competem por esta condição e somente uma delas pode criar/creditar Payment.
    const claimed = await tx.pixCharge.updateMany({
      where: { id: charge.id, status: "pending" },
      data: { status: "processing" },
    });
    if (claimed.count !== 1) return null;

    const paymentRow = await tx.payment.create({
      data: {
        invoiceId: invoice.id,
        amount: charge.amount,
        method: "PIX",
        notes: "Confirmado automaticamente via webhook do Mercado Pago.",
        recordedById: charge.initiatedByUserId,
      },
    });

    const newPaidAmount = Number(invoice.paidAmount) + Number(charge.amount);
    const status = newPaidAmount >= Number(invoice.totalAmount) ? "PAID" : "PARTIALLY_PAID";

    await tx.monthlyInvoice.update({ where: { id: invoice.id }, data: { paidAmount: newPaidAmount, status } });
    await tx.pixCharge.update({ where: { id: charge.id }, data: { status: "approved", paidAt: new Date() } });

    return { paymentRow, invoice };
  });

  if (!result) return Response.json({ ok: true });

  await recordAuditLog({
    actorUserId: charge.initiatedByUserId,
    action: "CREATE",
    entity: "Payment",
    entityId: result.paymentRow.id,
    newData: {
      childId: result.invoice.childId,
      amount: Number(result.paymentRow.amount),
      method: "PIX",
      source: "mercadopago-webhook",
    },
  });

  await notifyGuardians(
    result.invoice.childId,
    "FINANCIAL",
    "Pagamento confirmado",
    "Recebemos a confirmação do seu pagamento via Pix. Obrigado! 💛",
    "viewFinancial"
  );

  return Response.json({ ok: true });
}
