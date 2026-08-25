import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPixCharge, getPayment, isMercadoPagoConfigured, verifyMercadoPagoSignature } from "./mercadopago";

const originalToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
const originalFetch = global.fetch;

beforeEach(() => {
  process.env.MERCADO_PAGO_ACCESS_TOKEN = "TEST-TOKEN";
});

afterEach(() => {
  process.env.MERCADO_PAGO_ACCESS_TOKEN = originalToken;
  global.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe("isMercadoPagoConfigured", () => {
  it("CASO 1: true quando MERCADO_PAGO_ACCESS_TOKEN está definido", () => {
    expect(isMercadoPagoConfigured()).toBe(true);
  });

  it("CASO 2: false quando não está definido", () => {
    delete process.env.MERCADO_PAGO_ACCESS_TOKEN;
    expect(isMercadoPagoConfigured()).toBe(false);
  });
});

describe("createPixCharge", () => {
  it("CASO 1: monta a requisição corretamente e retorna os dados do QR code a partir da resposta", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 123456789,
        status: "pending",
        date_of_expiration: "2026-08-25T21:00:00.000Z",
        point_of_interaction: { transaction_data: { qr_code: "00020126...copia-cola", qr_code_base64: "iVBORw0KGgo=" } },
      }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await createPixCharge({
      amount: 900,
      description: "Mensalidade de agosto",
      externalReference: "invoice-1",
      payerEmail: "responsavel@example.com",
      idempotencyKey: "invoice-1:abc",
    });

    expect(result).toEqual({
      externalPaymentId: "123456789",
      status: "pending",
      qrCode: "iVBORw0KGgo=",
      qrCodeText: "00020126...copia-cola",
      expiresAt: new Date("2026-08-25T21:00:00.000Z"),
    });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.mercadopago.com/v1/payments");
    expect(init.method).toBe("POST");
    expect(init.headers.Authorization).toBe("Bearer TEST-TOKEN");
    expect(init.headers["X-Idempotency-Key"]).toBe("invoice-1:abc");
    const body = JSON.parse(init.body);
    expect(body).toMatchObject({
      transaction_amount: 900,
      payment_method_id: "pix",
      external_reference: "invoice-1",
      payer: { email: "responsavel@example.com" },
    });
  });

  it("CASO 2: lança erro quando o Mercado Pago responde com falha HTTP", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 400, text: async () => "invalid payer email" }) as unknown as typeof fetch;

    await expect(
      createPixCharge({
        amount: 900,
        description: "x",
        externalReference: "invoice-1",
        payerEmail: "invalido",
        idempotencyKey: "k",
      })
    ).rejects.toThrow(/Falha ao criar cobrança Pix/);
  });

  it("CASO 3: lança erro quando a resposta não traz os dados de QR code", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 1, status: "pending", point_of_interaction: {} }),
    }) as unknown as typeof fetch;

    await expect(
      createPixCharge({ amount: 900, description: "x", externalReference: "invoice-1", payerEmail: "a@b.com", idempotencyKey: "k" })
    ).rejects.toThrow(/sem dados de QR Code/);
  });

  it("CASO 4: lança erro quando MERCADO_PAGO_ACCESS_TOKEN não está configurado", async () => {
    delete process.env.MERCADO_PAGO_ACCESS_TOKEN;
    await expect(
      createPixCharge({ amount: 900, description: "x", externalReference: "invoice-1", payerEmail: "a@b.com", idempotencyKey: "k" })
    ).rejects.toThrow("Mercado Pago não configurado.");
  });
});

describe("getPayment", () => {
  it("CASO 1: consulta o endpoint correto e retorna o JSON da resposta", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: "1", status: "approved", external_reference: "invoice-1" }) });
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await getPayment("1");

    expect(result).toEqual({ id: "1", status: "approved", external_reference: "invoice-1" });
    expect(fetchMock).toHaveBeenCalledWith("https://api.mercadopago.com/v1/payments/1", {
      headers: { Authorization: "Bearer TEST-TOKEN" },
    });
  });

  it("CASO 2: lança erro em falha HTTP", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 404, text: async () => "not found" }) as unknown as typeof fetch;
    await expect(getPayment("999")).rejects.toThrow(/Falha ao consultar pagamento/);
  });
});

describe("verifyMercadoPagoSignature", () => {
  function sign(manifest: string, secret: string) {
    return createHmac("sha256", secret).update(manifest).digest("hex");
  }

  it("CASO 1: aceita uma assinatura válida gerada com o mesmo manifest e segredo", () => {
    const secret = "webhook-secret";
    const dataId = "123456";
    const xRequestId = "req-1";
    const ts = "1700000000";
    const v1 = sign(`id:${dataId};request-id:${xRequestId};ts:${ts};`, secret);

    const result = verifyMercadoPagoSignature({ xSignature: `ts=${ts},v1=${v1}`, xRequestId, dataId, secret });

    expect(result).toBe(true);
  });

  it("CASO 2: aceita quando o data.id chega em maiúsculas (a assinatura usa minúsculas no manifest)", () => {
    const secret = "webhook-secret";
    const dataId = "AbC123";
    const xRequestId = "req-1";
    const ts = "1700000000";
    const v1 = sign(`id:${dataId.toLowerCase()};request-id:${xRequestId};ts:${ts};`, secret);

    const result = verifyMercadoPagoSignature({ xSignature: `ts=${ts},v1=${v1}`, xRequestId, dataId, secret });

    expect(result).toBe(true);
  });

  it("CASO 3: rejeita quando o segredo usado para assinar é diferente", () => {
    const dataId = "123456";
    const xRequestId = "req-1";
    const ts = "1700000000";
    const v1 = sign(`id:${dataId};request-id:${xRequestId};ts:${ts};`, "outro-segredo");

    const result = verifyMercadoPagoSignature({ xSignature: `ts=${ts},v1=${v1}`, xRequestId, dataId, secret: "webhook-secret" });

    expect(result).toBe(false);
  });

  it("CASO 4: rejeita quando o data.id foi adulterado em relação ao que foi assinado", () => {
    const secret = "webhook-secret";
    const xRequestId = "req-1";
    const ts = "1700000000";
    const v1 = sign(`id:123456;request-id:${xRequestId};ts:${ts};`, secret);

    const result = verifyMercadoPagoSignature({ xSignature: `ts=${ts},v1=${v1}`, xRequestId, dataId: "999999", secret });

    expect(result).toBe(false);
  });

  it("CASO 5: rejeita quando o header x-signature está ausente", () => {
    const result = verifyMercadoPagoSignature({ xSignature: null, xRequestId: "req-1", dataId: "1", secret: "s" });
    expect(result).toBe(false);
  });

  it("CASO 6: rejeita quando o header x-request-id está ausente", () => {
    const result = verifyMercadoPagoSignature({ xSignature: "ts=1,v1=abc", xRequestId: null, dataId: "1", secret: "s" });
    expect(result).toBe(false);
  });

  it("CASO 7: rejeita um x-signature malformado (sem ts ou v1)", () => {
    const result = verifyMercadoPagoSignature({ xSignature: "garbage", xRequestId: "req-1", dataId: "1", secret: "s" });
    expect(result).toBe(false);
  });
});
