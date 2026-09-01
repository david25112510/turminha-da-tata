import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * generatePixChargeAction: idempotente (uma PixCharge "pending" ainda válida é reaproveitada em vez
 * de gerar outra no Mercado Pago), nunca credita a fatura aqui — só o webhook confirma o pagamento.
 */

const requireGuardianChildPermission = vi.fn();
const findUniqueInvoice = vi.fn();
const findFirstPixCharge = vi.fn();
const findUniquePixCharge = vi.fn();
const createPixChargeDb = vi.fn();
const createPixCharge = vi.fn();
const isMercadoPagoConfigured = vi.fn();
const recordAuditLog = vi.fn();

beforeEach(() => {
  vi.resetModules();
  vi.doMock("@/lib/authz", () => ({
    requireGuardianChildPermission: (...args: unknown[]) => requireGuardianChildPermission(...args),
  }));
  vi.doMock("@/lib/mercadopago", () => ({
    createPixCharge: (...args: unknown[]) => createPixCharge(...args),
    isMercadoPagoConfigured: (...args: unknown[]) => isMercadoPagoConfigured(...args),
  }));
  vi.doMock("@/lib/audit-log", () => ({ recordAuditLog: (...args: unknown[]) => recordAuditLog(...args) }));
  vi.doMock("@/lib/prisma", () => ({
    prisma: {
      monthlyInvoice: { findUnique: (...args: unknown[]) => findUniqueInvoice(...args) },
      pixCharge: {
        findFirst: (...args: unknown[]) => findFirstPixCharge(...args),
        findUnique: (...args: unknown[]) => findUniquePixCharge(...args),
        create: (...args: unknown[]) => createPixChargeDb(...args),
      },
    },
  }));

  requireGuardianChildPermission.mockReset().mockResolvedValue({
    user: { id: "user-1" },
    guardian: { name: "Maria Silva", email: "maria@example.com" },
  });
  isMercadoPagoConfigured.mockReset().mockReturnValue(true);
  findUniqueInvoice.mockReset();
  findFirstPixCharge.mockReset().mockResolvedValue(null);
  findUniquePixCharge.mockReset().mockResolvedValue(null);
  createPixCharge.mockReset();
  createPixChargeDb.mockReset().mockResolvedValue({ id: "charge-1" });
  recordAuditLog.mockReset().mockResolvedValue(undefined);
});

function formData(fields: Record<string, string>) {
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) fd.set(key, value);
  return fd;
}

const openInvoice = {
  id: "inv-1",
  childId: "child-1",
  status: "PENDING" as const,
  dueDate: new Date(Date.now() + 86_400_000),
  totalAmount: 900,
  paidAmount: 0,
  referenceMonth: 3,
};

describe("generatePixChargeAction", () => {
  it("CASO 1: indisponível quando o Mercado Pago não está configurado", async () => {
    isMercadoPagoConfigured.mockReturnValue(false);
    const { generatePixChargeAction } = await import("./actions");

    const result = await generatePixChargeAction(undefined, formData({ invoiceId: "inv-1", childId: "child-1" }));

    expect(result).toEqual({ error: "Pagamento via Pix está temporariamente indisponível." });
    expect(requireGuardianChildPermission).not.toHaveBeenCalled();
  });

  it("CASO 2: exige e-mail cadastrado no perfil do responsável", async () => {
    requireGuardianChildPermission.mockResolvedValueOnce({ user: { id: "user-1" }, guardian: { name: "Maria", email: null } });
    const { generatePixChargeAction } = await import("./actions");

    const result = await generatePixChargeAction(undefined, formData({ invoiceId: "inv-1", childId: "child-1" }));

    expect(result).toEqual({ error: "Cadastre um e-mail no seu perfil para gerar cobranças Pix." });
  });

  it("CASO 3: recusa quando a cobrança não existe ou não pertence à criança", async () => {
    findUniqueInvoice.mockResolvedValueOnce(null);
    const { generatePixChargeAction } = await import("./actions");

    const result = await generatePixChargeAction(undefined, formData({ invoiceId: "inv-1", childId: "child-1" }));

    expect(result).toEqual({ error: "Cobrança não encontrada." });
  });

  it("CASO 4: recusa gerar Pix para cobrança já paga", async () => {
    findUniqueInvoice.mockResolvedValueOnce({ ...openInvoice, status: "PAID", paidAmount: 900 });
    const { generatePixChargeAction } = await import("./actions");

    const result = await generatePixChargeAction(undefined, formData({ invoiceId: "inv-1", childId: "child-1" }));

    expect(result).toEqual({ error: "Esta cobrança não está mais em aberto." });
    expect(createPixCharge).not.toHaveBeenCalled();
  });

  it("CASO 5: recusa gerar Pix para cobrança cancelada", async () => {
    findUniqueInvoice.mockResolvedValueOnce({ ...openInvoice, status: "CANCELLED" });
    const { generatePixChargeAction } = await import("./actions");

    const result = await generatePixChargeAction(undefined, formData({ invoiceId: "inv-1", childId: "child-1" }));

    expect(result).toEqual({ error: "Esta cobrança não está mais em aberto." });
  });

  it("CASO 6: reaproveita uma PixCharge pendente e ainda válida em vez de criar outra no Mercado Pago", async () => {
    findUniqueInvoice.mockResolvedValueOnce(openInvoice);
    findFirstPixCharge.mockResolvedValueOnce({
      qrCode: "base64-existente",
      qrCodeText: "copia-cola-existente",
      expiresAt: new Date("2026-08-25T22:00:00.000Z"),
    });
    const { generatePixChargeAction } = await import("./actions");

    const result = await generatePixChargeAction(undefined, formData({ invoiceId: "inv-1", childId: "child-1" }));

    expect(result).toEqual({ qrCode: "base64-existente", qrCodeText: "copia-cola-existente", expiresAt: "2026-08-25T22:00:00.000Z" });
    expect(createPixCharge).not.toHaveBeenCalled();
    expect(createPixChargeDb).not.toHaveBeenCalled();
  });

  it("CASO 7: cria uma nova cobrança Pix pelo saldo em aberto e grava no banco", async () => {
    findUniqueInvoice.mockResolvedValueOnce(openInvoice);
    createPixCharge.mockResolvedValueOnce({
      externalPaymentId: "mp-1",
      status: "pending",
      qrCode: "base64-novo",
      qrCodeText: "copia-cola-novo",
      expiresAt: new Date("2026-08-25T22:00:00.000Z"),
    });
    const { generatePixChargeAction } = await import("./actions");

    const result = await generatePixChargeAction(undefined, formData({ invoiceId: "inv-1", childId: "child-1" }));

    expect(createPixCharge).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 900, externalReference: "inv-1", payerEmail: "maria@example.com" })
    );
    expect(createPixChargeDb).toHaveBeenCalledWith({
      data: expect.objectContaining({
        invoiceId: "inv-1",
        externalPaymentId: "mp-1",
        initiatedByUserId: "user-1",
        status: "pending",
        amount: 900,
        qrCode: "base64-novo",
        qrCodeText: "copia-cola-novo",
      }),
    });
    expect(recordAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ actorUserId: "user-1", action: "CREATE", entity: "PixCharge", entityId: "charge-1" })
    );
    expect(result).toEqual({ qrCode: "base64-novo", qrCodeText: "copia-cola-novo", expiresAt: "2026-08-25T22:00:00.000Z" });
  });

  it("CASO 8: usa o saldo em aberto (não o total), quando já houve pagamento parcial", async () => {
    findUniqueInvoice.mockResolvedValueOnce({ ...openInvoice, paidAmount: 300, status: "PARTIALLY_PAID" });
    createPixCharge.mockResolvedValueOnce({
      externalPaymentId: "mp-2",
      status: "pending",
      qrCode: "b",
      qrCodeText: "c",
      expiresAt: new Date(),
    });
    const { generatePixChargeAction } = await import("./actions");

    await generatePixChargeAction(undefined, formData({ invoiceId: "inv-1", childId: "child-1" }));

    expect(createPixCharge).toHaveBeenCalledWith(expect.objectContaining({ amount: 600 }));
  });

  it("CASO 9: erro na criação no Mercado Pago vira mensagem amigável, sem gravar nada", async () => {
    findUniqueInvoice.mockResolvedValueOnce(openInvoice);
    createPixCharge.mockRejectedValueOnce(new Error("timeout"));
    const { generatePixChargeAction } = await import("./actions");

    const result = await generatePixChargeAction(undefined, formData({ invoiceId: "inv-1", childId: "child-1" }));

    expect(result).toEqual({ error: "Não foi possível gerar a cobrança Pix agora. Tente novamente em instantes." });
    expect(createPixChargeDb).not.toHaveBeenCalled();
  });

  it("CASO 10: concorrência reaproveita a cobrança persistida pela requisição vencedora", async () => {
    findUniqueInvoice.mockResolvedValueOnce(openInvoice);
    createPixCharge.mockResolvedValueOnce({
      externalPaymentId: "mp-shared",
      status: "pending",
      qrCode: "qr-provider",
      qrCodeText: "text-provider",
      expiresAt: new Date("2026-09-01T12:00:00.000Z"),
    });
    createPixChargeDb.mockRejectedValueOnce(new Error("unique constraint"));
    findUniquePixCharge.mockResolvedValueOnce({
      qrCode: "qr-winner",
      qrCodeText: "text-winner",
      expiresAt: new Date("2026-09-01T12:00:00.000Z"),
    });
    const { generatePixChargeAction } = await import("./actions");

    const result = await generatePixChargeAction(undefined, formData({ invoiceId: "inv-1", childId: "child-1" }));

    expect(createPixCharge).toHaveBeenCalledWith(expect.objectContaining({ idempotencyKey: expect.stringMatching(/^[a-f0-9]{64}$/) }));
    expect(result).toEqual({ qrCode: "qr-winner", qrCodeText: "text-winner", expiresAt: "2026-09-01T12:00:00.000Z" });
    expect(recordAuditLog).not.toHaveBeenCalled();
  });
});
