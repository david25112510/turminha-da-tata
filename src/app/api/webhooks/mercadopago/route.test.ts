import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Webhook do Mercado Pago é a única fonte de verdade para confirmar um Pix — nunca o cliente. Casos
 * cobertos: filtragem de eventos irrelevantes, verificação de assinatura (quando configurada),
 * idempotência (reenvio do mesmo evento, ou uma PixCharge já aprovada) e o crédito efetivo na
 * fatura + Payment + auditoria + notificação quando tudo bate.
 */

const getPayment = vi.fn();
const verifyMercadoPagoSignature = vi.fn();
const recordAuditLog = vi.fn();
const notifyGuardians = vi.fn();
const findUniquePixCharge = vi.fn();
const findUniqueInvoice = vi.fn();
const createPayment = vi.fn();
const updateInvoice = vi.fn();
const updatePixCharge = vi.fn();
const updateManyPixCharges = vi.fn();

const originalSecret = process.env.MERCADO_PAGO_WEBHOOK_SECRET;

beforeEach(() => {
  vi.resetModules();
  delete process.env.MERCADO_PAGO_WEBHOOK_SECRET;

  vi.doMock("@/lib/mercadopago", () => ({
    getPayment: (...args: unknown[]) => getPayment(...args),
    verifyMercadoPagoSignature: (...args: unknown[]) => verifyMercadoPagoSignature(...args),
  }));
  vi.doMock("@/lib/audit-log", () => ({ recordAuditLog: (...args: unknown[]) => recordAuditLog(...args) }));
  vi.doMock("@/lib/notifications", () => ({ notifyGuardians: (...args: unknown[]) => notifyGuardians(...args) }));
  vi.doMock("@/lib/prisma", () => ({
    prisma: {
      pixCharge: {
        findUnique: (...args: unknown[]) => findUniquePixCharge(...args),
        update: (...args: unknown[]) => updatePixCharge(...args),
      },
      monthlyInvoice: {
        findUnique: (...args: unknown[]) => findUniqueInvoice(...args),
        update: (...args: unknown[]) => updateInvoice(...args),
      },
      payment: {
        create: (...args: unknown[]) => createPayment(...args),
      },
      $transaction: async (callback: (tx: unknown) => unknown) =>
        callback({
          monthlyInvoice: { findUnique: findUniqueInvoice, update: updateInvoice },
          payment: { create: createPayment },
          pixCharge: { update: updatePixCharge, updateMany: updateManyPixCharges },
        }),
    },
  }));

  getPayment.mockReset();
  verifyMercadoPagoSignature.mockReset().mockReturnValue(true);
  recordAuditLog.mockReset().mockResolvedValue(undefined);
  notifyGuardians.mockReset().mockResolvedValue(undefined);
  findUniquePixCharge.mockReset();
  findUniqueInvoice.mockReset();
  createPayment.mockReset();
  updateInvoice.mockReset();
  updatePixCharge.mockReset();
  updateManyPixCharges.mockReset().mockResolvedValue({ count: 1 });
});

afterEach(() => {
  if (originalSecret === undefined) delete process.env.MERCADO_PAGO_WEBHOOK_SECRET;
  else process.env.MERCADO_PAGO_WEBHOOK_SECRET = originalSecret;
});

function webhookRequest(body: unknown, headers: Record<string, string> = {}) {
  return new Request("https://app.turminhadatata.com.br/api/webhooks/mercadopago", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

describe("POST /api/webhooks/mercadopago", () => {
  it("CASO 1: ignora eventos que não são do tipo payment", async () => {
    const { POST } = await import("./route");
    const response = await POST(webhookRequest({ type: "merchant_order", data: { id: "1" } }));

    expect(response.status).toBe(200);
    expect(getPayment).not.toHaveBeenCalled();
  });

  it("CASO 2: ignora quando não há data.id", async () => {
    const { POST } = await import("./route");
    const response = await POST(webhookRequest({ type: "payment", data: {} }));

    expect(response.status).toBe(200);
    expect(getPayment).not.toHaveBeenCalled();
  });

  it("CASO 3: sem MERCADO_PAGO_WEBHOOK_SECRET configurado, pula a verificação de assinatura", async () => {
    getPayment.mockResolvedValueOnce({ status: "pending" });
    const { POST } = await import("./route");

    await POST(webhookRequest({ type: "payment", data: { id: "1" } }));

    expect(verifyMercadoPagoSignature).not.toHaveBeenCalled();
    expect(getPayment).toHaveBeenCalledWith("1");
  });

  it("CASO 4: com segredo configurado, rejeita quando a assinatura é inválida", async () => {
    process.env.MERCADO_PAGO_WEBHOOK_SECRET = "secret";
    verifyMercadoPagoSignature.mockReturnValueOnce(false);
    const { POST } = await import("./route");

    const response = await POST(webhookRequest({ type: "payment", data: { id: "1" } }, { "x-signature": "ts=1,v1=x", "x-request-id": "r1" }));

    expect(response.status).toBe(401);
    expect(getPayment).not.toHaveBeenCalled();
  });

  it("CASO 5: com segredo configurado e assinatura válida, segue o fluxo normal", async () => {
    process.env.MERCADO_PAGO_WEBHOOK_SECRET = "secret";
    verifyMercadoPagoSignature.mockReturnValueOnce(true);
    getPayment.mockResolvedValueOnce({ status: "pending" });
    const { POST } = await import("./route");

    const response = await POST(webhookRequest({ type: "payment", data: { id: "1" } }, { "x-signature": "ts=1,v1=x", "x-request-id": "r1" }));

    expect(response.status).toBe(200);
    expect(getPayment).toHaveBeenCalledWith("1");
  });

  it("CASO 6: pagamento ainda não aprovado não credita nada", async () => {
    getPayment.mockResolvedValueOnce({ status: "pending" });
    const { POST } = await import("./route");

    await POST(webhookRequest({ type: "payment", data: { id: "1" } }));

    expect(findUniquePixCharge).not.toHaveBeenCalled();
    expect(createPayment).not.toHaveBeenCalled();
  });

  it("CASO 7: pagamento aprovado mas sem PixCharge correspondente não credita nada (não é nosso)", async () => {
    getPayment.mockResolvedValueOnce({ status: "approved" });
    findUniquePixCharge.mockResolvedValueOnce(null);
    const { POST } = await import("./route");

    await POST(webhookRequest({ type: "payment", data: { id: "1" } }));

    expect(createPayment).not.toHaveBeenCalled();
  });

  it("CASO 8: PixCharge já aprovada anteriormente não duplica o Payment (idempotência de reenvio)", async () => {
    getPayment.mockResolvedValueOnce({ status: "approved" });
    findUniquePixCharge.mockResolvedValueOnce({ id: "charge-1", invoiceId: "inv-1", status: "approved", amount: 900 });
    const { POST } = await import("./route");

    await POST(webhookRequest({ type: "payment", data: { id: "1" } }));

    expect(createPayment).not.toHaveBeenCalled();
  });

  it("CASO 9: fatura já cancelada não credita o pagamento", async () => {
    getPayment.mockResolvedValueOnce({ status: "approved" });
    findUniquePixCharge.mockResolvedValueOnce({
      id: "charge-1",
      invoiceId: "inv-1",
      status: "pending",
      amount: 900,
      initiatedByUserId: "user-1",
    });
    findUniqueInvoice.mockResolvedValueOnce({ id: "inv-1", status: "CANCELLED", paidAmount: 0, totalAmount: 900, childId: "child-1" });
    const { POST } = await import("./route");

    await POST(webhookRequest({ type: "payment", data: { id: "1" } }));

    expect(createPayment).not.toHaveBeenCalled();
    expect(recordAuditLog).not.toHaveBeenCalled();
  });

  it("CASO 10: pagamento aprovado credita a fatura, cria o Payment, marca PAID quando quita o total, audita e notifica", async () => {
    getPayment.mockResolvedValueOnce({ status: "approved" });
    findUniquePixCharge.mockResolvedValueOnce({
      id: "charge-1",
      invoiceId: "inv-1",
      status: "pending",
      amount: 900,
      initiatedByUserId: "user-1",
    });
    findUniqueInvoice.mockResolvedValueOnce({ id: "inv-1", status: "PENDING", paidAmount: 0, totalAmount: 900, childId: "child-1" });
    createPayment.mockResolvedValueOnce({ id: "payment-1", amount: 900 });
    const { POST } = await import("./route");

    const response = await POST(webhookRequest({ type: "payment", data: { id: "1" } }));

    expect(response.status).toBe(200);
    expect(createPayment).toHaveBeenCalledWith({
      data: { invoiceId: "inv-1", amount: 900, method: "PIX", notes: expect.any(String), recordedById: "user-1" },
    });
    expect(updateInvoice).toHaveBeenCalledWith({ where: { id: "inv-1" }, data: { paidAmount: 900, status: "PAID" } });
    expect(updatePixCharge).toHaveBeenCalledWith({ where: { id: "charge-1" }, data: { status: "approved", paidAt: expect.any(Date) } });
    expect(recordAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ actorUserId: "user-1", action: "CREATE", entity: "Payment", entityId: "payment-1" })
    );
    expect(notifyGuardians).toHaveBeenCalledWith("child-1", "FINANCIAL", expect.any(String), expect.any(String), "viewFinancial");
  });

  it("CASO 11: pagamento parcial mantém a fatura como PARTIALLY_PAID", async () => {
    getPayment.mockResolvedValueOnce({ status: "approved" });
    findUniquePixCharge.mockResolvedValueOnce({
      id: "charge-1",
      invoiceId: "inv-1",
      status: "pending",
      amount: 300,
      initiatedByUserId: "user-1",
    });
    findUniqueInvoice.mockResolvedValueOnce({ id: "inv-1", status: "PENDING", paidAmount: 0, totalAmount: 900, childId: "child-1" });
    createPayment.mockResolvedValueOnce({ id: "payment-1", amount: 300 });
    const { POST } = await import("./route");

    await POST(webhookRequest({ type: "payment", data: { id: "1" } }));

    expect(updateInvoice).toHaveBeenCalledWith({ where: { id: "inv-1" }, data: { paidAmount: 300, status: "PARTIALLY_PAID" } });
  });

  it("CASO 12: somente o vencedor do claim atômico credita webhooks concorrentes", async () => {
    getPayment.mockResolvedValueOnce({ status: "approved" });
    findUniquePixCharge.mockResolvedValueOnce({
      id: "charge-1",
      invoiceId: "inv-1",
      status: "pending",
      amount: 900,
      initiatedByUserId: "user-1",
    });
    findUniqueInvoice.mockResolvedValueOnce({ id: "inv-1", status: "PENDING", paidAmount: 0, totalAmount: 900, childId: "child-1" });
    updateManyPixCharges.mockResolvedValueOnce({ count: 0 });
    const { POST } = await import("./route");

    const response = await POST(webhookRequest({ type: "payment", data: { id: "1" } }));

    expect(response.status).toBe(200);
    expect(updateManyPixCharges).toHaveBeenCalledWith({
      where: { id: "charge-1", status: "pending" },
      data: { status: "processing" },
    });
    expect(createPayment).not.toHaveBeenCalled();
    expect(updateInvoice).not.toHaveBeenCalled();
  });
});
