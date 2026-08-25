import { createHmac, timingSafeEqual } from "node:crypto";

const API_BASE = "https://api.mercadopago.com";
const PIX_EXPIRATION_MINUTES = 30;

export function isMercadoPagoConfigured() {
  return Boolean(process.env.MERCADO_PAGO_ACCESS_TOKEN);
}

type CreatePixChargeParams = {
  amount: number;
  description: string;
  externalReference: string;
  payerEmail: string;
  payerFirstName?: string;
  payerLastName?: string;
  idempotencyKey: string;
};

export type PixChargeResult = {
  externalPaymentId: string;
  status: string;
  qrCode: string;
  qrCodeText: string;
  expiresAt: Date;
};

/**
 * Cria uma cobrança Pix via API HTTP do Mercado Pago (sem SDK — mesmo padrão de src/lib/email.ts e
 * src/lib/push.ts). O QR code (base64) e o código copia-e-cola vêm em point_of_interaction.transaction_data;
 * sem eles a cobrança não é utilizável, então tratamos como erro em vez de devolver um resultado incompleto.
 */
export async function createPixCharge(params: CreatePixChargeParams): Promise<PixChargeResult> {
  if (!isMercadoPagoConfigured()) throw new Error("Mercado Pago não configurado.");

  const expiresAt = new Date(Date.now() + PIX_EXPIRATION_MINUTES * 60_000);

  const response = await fetch(`${API_BASE}/v1/payments`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
      "X-Idempotency-Key": params.idempotencyKey,
    },
    body: JSON.stringify({
      transaction_amount: params.amount,
      description: params.description,
      payment_method_id: "pix",
      payer: {
        email: params.payerEmail,
        first_name: params.payerFirstName,
        last_name: params.payerLastName,
      },
      external_reference: params.externalReference,
      date_of_expiration: expiresAt.toISOString(),
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Falha ao criar cobrança Pix no Mercado Pago (${response.status}): ${body}`);
  }

  const data = await response.json();
  const transactionData = data?.point_of_interaction?.transaction_data;
  if (!transactionData?.qr_code || !transactionData?.qr_code_base64) {
    throw new Error("Resposta do Mercado Pago sem dados de QR Code Pix.");
  }

  return {
    externalPaymentId: String(data.id),
    status: String(data.status),
    qrCode: transactionData.qr_code_base64,
    qrCodeText: transactionData.qr_code,
    expiresAt: data.date_of_expiration ? new Date(data.date_of_expiration) : expiresAt,
  };
}

/** Consulta o status atual de um pagamento — usado pelo webhook para confirmar antes de creditar. */
export async function getPayment(paymentId: string): Promise<{ id: string; status: string; external_reference: string | null }> {
  if (!isMercadoPagoConfigured()) throw new Error("Mercado Pago não configurado.");

  const response = await fetch(`${API_BASE}/v1/payments/${encodeURIComponent(paymentId)}`, {
    headers: { Authorization: `Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN}` },
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Falha ao consultar pagamento no Mercado Pago (${response.status}): ${body}`);
  }

  return response.json();
}

/**
 * Valida a assinatura HMAC-SHA256 do webhook do Mercado Pago (header x-signature: "ts=...,v1=...").
 * Manifest exato exigido pela documentação: "id:{data.id};request-id:{x-request-id};ts:{ts};" — o id
 * precisa estar em minúsculas. Comparação em tempo constante para não vazar o segredo por timing.
 */
export function verifyMercadoPagoSignature(params: {
  xSignature: string | null;
  xRequestId: string | null;
  dataId: string;
  secret: string;
}): boolean {
  const { xSignature, xRequestId, dataId, secret } = params;
  if (!xSignature || !xRequestId || !dataId) return false;

  const parts = new Map(
    xSignature
      .split(",")
      .map((part) => part.trim().split("="))
      .filter((pair): pair is [string, string] => pair.length === 2)
      .map(([key, value]) => [key.trim(), value.trim()])
  );
  const ts = parts.get("ts");
  const v1 = parts.get("v1");
  if (!ts || !v1) return false;

  const manifest = `id:${dataId.toLowerCase()};request-id:${xRequestId};ts:${ts};`;
  const expectedHex = createHmac("sha256", secret).update(manifest).digest("hex");

  const expectedBuffer = Buffer.from(expectedHex, "hex");
  const actualBuffer = Buffer.from(v1, "hex");
  if (expectedBuffer.length !== actualBuffer.length || actualBuffer.length === 0) return false;

  return timingSafeEqual(expectedBuffer, actualBuffer);
}
