import { beforeEach, describe, expect, it, vi } from "vitest";
import { calculateOvertimeAmount, calculateOvertimeForAttendance, calculateOvertimeMinutes } from "./financial";

function at(hour: number, minute: number) {
  const d = new Date(2026, 7, 21, hour, minute, 0, 0);
  return d;
}

describe("calculateOvertimeMinutes — tolerância como dedução, não como limiar", () => {
  it("CASO 1: 17:30 contratado, tolerância 15, saída 17:44 → 0 minutos cobrados", () => {
    expect(calculateOvertimeMinutes(at(17, 44), "17:30", 15)).toBe(0);
  });

  it("CASO 2: saída exatamente no limite da tolerância (17:45) → 0 minutos", () => {
    expect(calculateOvertimeMinutes(at(17, 45), "17:30", 15)).toBe(0);
  });

  it("CASO 3: saída 1 minuto além da tolerância (17:46) → 1 minuto cobrado", () => {
    expect(calculateOvertimeMinutes(at(17, 46), "17:30", 15)).toBe(1);
  });

  it("CASO 4: saída 18:00, tolerância 15 → 15 minutos cobrados (30 de excedente bruto - 15)", () => {
    expect(calculateOvertimeMinutes(at(18, 0), "17:30", 15)).toBe(15);
  });

  it("CASO 5: saída 18:00, tolerância 0 → 30 minutos cobrados", () => {
    expect(calculateOvertimeMinutes(at(18, 0), "17:30", 0)).toBe(30);
  });

  it("CASO 6: saída antes do horário contratado → 0 minutos", () => {
    expect(calculateOvertimeMinutes(at(17, 0), "17:30", 15)).toBe(0);
  });
});

describe("calculateOvertimeAmount — valor por minuto (hora / 60), sem arredondar para hora cheia", () => {
  it("CASO 7: R$15/h, 1 minuto cobrável → R$0,25", () => {
    expect(calculateOvertimeAmount(1, 15)).toBeCloseTo(0.25, 2);
  });

  it("CASO 8: R$15/h, 30 minutos cobráveis → R$7,50", () => {
    expect(calculateOvertimeAmount(30, 15)).toBeCloseTo(7.5, 2);
  });

  it("CASO 9: R$15/h, 60 minutos cobráveis → R$15,00", () => {
    expect(calculateOvertimeAmount(60, 15)).toBeCloseTo(15, 2);
  });

  it("não cobra nada para 0 ou minutos negativos", () => {
    expect(calculateOvertimeAmount(0, 15)).toBe(0);
    expect(calculateOvertimeAmount(-5, 15)).toBe(0);
  });
});

describe("calculateOvertimeForAttendance (composição de calculateOvertimeMinutes + calculateOvertimeAmount)", () => {
  it("42min de atraso bruto, tolerância 15 → 27min cobráveis a R$15/h = R$6,75", () => {
    const result = calculateOvertimeForAttendance(at(18, 12), "17:30", 15, 15);
    expect(result.minutesLate).toBe(27);
    expect(result.amount).toBeCloseTo(6.75, 2);
  });

  it("dentro da tolerância não cobra nada", () => {
    const result = calculateOvertimeForAttendance(at(17, 42), "17:30", 15, 15);
    expect(result.minutesLate).toBe(0);
    expect(result.amount).toBe(0);
  });
});

describe("getMonthlyOvertimeBreakdown — lê do snapshot quando a fatura já existe, ao vivo só quando ainda não existe", () => {
  const findUniqueInvoice = vi.fn();
  const findUniqueOrThrowChild = vi.fn();
  const findManyAttendance = vi.fn();

  beforeEach(() => {
    vi.resetModules();
    vi.doMock("@/lib/prisma", () => ({
      prisma: {
        monthlyInvoice: { findUnique: (...args: unknown[]) => findUniqueInvoice(...args) },
        child: { findUniqueOrThrow: (...args: unknown[]) => findUniqueOrThrowChild(...args) },
        attendance: { findMany: (...args: unknown[]) => findManyAttendance(...args) },
      },
    }));
    findUniqueInvoice.mockReset();
    findUniqueOrThrowChild.mockReset().mockResolvedValue({
      id: "child-1",
      overtimeHourRate: 15,
      contractedExitTime: "17:30",
      toleranceMinutes: 15,
    });
    findManyAttendance.mockReset().mockResolvedValue([]);
  });

  it("CASO 11: mês corrente/aberto (sem fatura ainda) recalcula ao vivo a partir de Attendance", async () => {
    findUniqueInvoice.mockResolvedValueOnce(null);
    findManyAttendance.mockResolvedValueOnce([
      { date: new Date(2026, 8, 5), checkOutTime: new Date(2026, 8, 5, 18, 0) }, // 30min bruto - 15 tolerância = 15min
    ]);

    const { getMonthlyOvertimeBreakdown } = await import("./financial");
    const { entries, total } = await getMonthlyOvertimeBreakdown("child-1", 9, 2026);

    expect(findManyAttendance).toHaveBeenCalledOnce();
    expect(entries).toEqual([{ date: new Date(2026, 8, 5), minutesLate: 15, amount: 3.75 }]);
    expect(total).toBe(3.75);
  });

  it("CASO 12: mês já fechado (fatura existe) lê do snapshot de InvoiceItem, sem consultar Attendance", async () => {
    findUniqueInvoice.mockResolvedValueOnce({
      createdAt: new Date(2026, 9, 1),
      items: [
        { quantity: 15, amount: 3.75, metadata: { date: "2026-09-05T00:00:00.000Z" } },
        { quantity: 5, amount: 1.25, metadata: { date: "2026-09-12T00:00:00.000Z" } },
      ],
    });

    const { getMonthlyOvertimeBreakdown } = await import("./financial");
    const { entries, total } = await getMonthlyOvertimeBreakdown("child-1", 9, 2026);

    expect(findManyAttendance).not.toHaveBeenCalled();
    expect(findUniqueOrThrowChild).not.toHaveBeenCalled();
    expect(entries).toEqual([
      { date: new Date("2026-09-05T00:00:00.000Z"), minutesLate: 15, amount: 3.75 },
      { date: new Date("2026-09-12T00:00:00.000Z"), minutesLate: 5, amount: 1.25 },
    ]);
    expect(total).toBe(5);
  });

  it("CASO 13: item de snapshot sem metadata.date (fatura antiga, anterior a esta mudança) cai para invoice.createdAt em vez de quebrar", async () => {
    const createdAt = new Date(2026, 9, 1);
    findUniqueInvoice.mockResolvedValueOnce({
      createdAt,
      items: [{ quantity: 10, amount: 2.5, metadata: null }],
    });

    const { getMonthlyOvertimeBreakdown } = await import("./financial");
    const { entries } = await getMonthlyOvertimeBreakdown("child-1", 9, 2026);

    expect(entries).toEqual([{ date: createdAt, minutesLate: 10, amount: 2.5 }]);
  });

  it("CASO 14: Attendance mudar depois do fechamento não afeta o resultado — o snapshot já congelado é a fonte da verdade", async () => {
    findUniqueInvoice.mockResolvedValueOnce({
      createdAt: new Date(2026, 9, 1),
      items: [{ quantity: 15, amount: 3.75, metadata: { date: "2026-09-05T00:00:00.000Z" } }],
    });
    // Se getMonthlyOvertimeBreakdown recalculasse ao vivo por engano, pegaria isto (60min → 45min
    // cobrados) em vez do snapshot (15min) — a asserção abaixo prova que isso não acontece.
    findManyAttendance.mockResolvedValueOnce([
      { date: new Date(2026, 8, 5), checkOutTime: new Date(2026, 8, 5, 18, 30) },
    ]);

    const { getMonthlyOvertimeBreakdown } = await import("./financial");
    const { total } = await getMonthlyOvertimeBreakdown("child-1", 9, 2026);

    expect(total).toBe(3.75);
  });
});

describe("closeMonth", () => {
  const findUniqueInvoice = vi.fn();
  const findUniqueOrThrowChild = vi.fn();
  const findManyAttendance = vi.fn();
  const upsertInvoice = vi.fn();
  const deleteManyItems = vi.fn();
  const createManyItems = vi.fn();
  const findUniqueOrThrowInvoice = vi.fn();

  const tx = {
    monthlyInvoice: {
      findUnique: (...args: unknown[]) => findUniqueInvoice(...args),
      upsert: (...args: unknown[]) => upsertInvoice(...args),
      findUniqueOrThrow: (...args: unknown[]) => findUniqueOrThrowInvoice(...args),
    },
    child: { findUniqueOrThrow: (...args: unknown[]) => findUniqueOrThrowChild(...args) },
    attendance: { findMany: (...args: unknown[]) => findManyAttendance(...args) },
    invoiceItem: {
      deleteMany: (...args: unknown[]) => deleteManyItems(...args),
      createMany: (...args: unknown[]) => createManyItems(...args),
    },
  };

  const baseChild = {
    id: "child-1",
    monthlyFee: 900,
    overtimeHourRate: 15,
    contractedExitTime: "17:30",
    toleranceMinutes: 15,
    dueDay: 5,
  };

  // vi.doMock is not hoisted and only affects imports made after it runs — re-registering it here (right
  // before vi.resetModules + the dynamic import in each test) prevents other describe blocks in this file
  // from clobbering the "@/lib/prisma" mock this suite needs.
  beforeEach(() => {
    vi.resetModules();
    vi.doMock("@/lib/prisma", () => ({
      prisma: { $transaction: (fn: (tx: unknown) => unknown) => fn(tx) },
    }));
    findUniqueInvoice.mockReset();
    findUniqueOrThrowChild.mockReset().mockResolvedValue(baseChild);
    findManyAttendance.mockReset().mockResolvedValue([]);
    upsertInvoice.mockReset().mockResolvedValue({ id: "invoice-1" });
    deleteManyItems.mockReset().mockResolvedValue({ count: 0 });
    createManyItems.mockReset().mockResolvedValue({ count: 0 });
    findUniqueOrThrowInvoice.mockReset().mockResolvedValue({ id: "invoice-1", items: [] });
  });

  it.each(["PAID", "PARTIALLY_PAID", "CANCELLED"])(
    "refuses to recalculate a %s invoice",
    async (status) => {
      findUniqueInvoice.mockResolvedValueOnce({ status });

      const { closeMonth } = await import("./financial");
      await expect(closeMonth("child-1", 9, 2026)).rejects.toThrow(
        "Esta cobrança já foi paga ou cancelada e não pode ser recalculada."
      );
      expect(upsertInvoice).not.toHaveBeenCalled();
      expect(createManyItems).not.toHaveBeenCalled();
    }
  );

  it.each(["PENDING", "OVERDUE"])("recalculates a %s invoice normally and writes MONTHLY_FEE + OVERTIME items", async (status) => {
    findUniqueInvoice.mockResolvedValueOnce({ status });
    findManyAttendance.mockResolvedValueOnce([
      { date: new Date(2026, 8, 5), checkOutTime: new Date(2026, 8, 5, 18, 0) }, // 30min gross - 15 tolerance = 15 billable
    ]);

    const { closeMonth } = await import("./financial");
    await closeMonth("child-1", 9, 2026);

    expect(upsertInvoice).toHaveBeenCalledOnce();
    expect(deleteManyItems).toHaveBeenCalledWith({ where: { invoiceId: "invoice-1" } });
    const items = createManyItems.mock.calls[0][0].data;
    expect(items).toEqual([
      expect.objectContaining({ type: "MONTHLY_FEE", amount: 900 }),
      expect.objectContaining({ type: "OVERTIME", quantity: 15, amount: 3.75 }),
    ]);
    // metadata.date é o que getMonthlyOvertimeBreakdown lê para reconstruir o snapshot depois do
    // fechamento — sem isso, o detalhamento congelado perderia a data de cada excedente.
    const overtimeItem = items.find((i: { type: string }) => i.type === "OVERTIME");
    expect(overtimeItem.metadata).toEqual({ date: new Date(2026, 8, 5).toISOString() });
  });

  it("creates a fresh invoice when none exists yet for the period", async () => {
    findUniqueInvoice.mockResolvedValueOnce(null);

    const { closeMonth } = await import("./financial");
    await closeMonth("child-1", 9, 2026);
    expect(upsertInvoice).toHaveBeenCalledOnce();
  });

  it("adds a DISCOUNT item (negative amount) and an OTHER item when provided", async () => {
    findUniqueInvoice.mockResolvedValueOnce(null);

    const { closeMonth } = await import("./financial");
    await closeMonth("child-1", 9, 2026, 50, 20);

    const items = createManyItems.mock.calls[0][0].data;
    expect(items).toContainEqual(expect.objectContaining({ type: "DISCOUNT", amount: -50 }));
    expect(items).toContainEqual(expect.objectContaining({ type: "OTHER", amount: 20 }));
  });

  it("CASO 10: executando closeMonth duas vezes seguidas não duplica InvoiceItems — cada chamada substitui o conjunto inteiro", async () => {
    findUniqueInvoice.mockResolvedValueOnce(null).mockResolvedValueOnce({ status: "PENDING" });

    const { closeMonth } = await import("./financial");
    await closeMonth("child-1", 9, 2026);
    await closeMonth("child-1", 9, 2026);

    expect(deleteManyItems).toHaveBeenCalledTimes(2);
    expect(createManyItems).toHaveBeenCalledTimes(2);
    const firstCallItems = createManyItems.mock.calls[0][0].data;
    const secondCallItems = createManyItems.mock.calls[1][0].data;
    expect(secondCallItems).toHaveLength(firstCallItems.length);
    expect(secondCallItems).toEqual(firstCallItems);
  });
});

describe("applyInvoiceAdjustment", () => {
  const findUniqueInvoice = vi.fn();
  const createItem = vi.fn();
  const updateInvoice = vi.fn();

  const tx = {
    monthlyInvoice: {
      findUnique: (...args: unknown[]) => findUniqueInvoice(...args),
      update: (...args: unknown[]) => updateInvoice(...args),
    },
    invoiceItem: { create: (...args: unknown[]) => createItem(...args) },
  };

  beforeEach(() => {
    vi.resetModules();
    vi.doMock("@/lib/prisma", () => ({
      prisma: { $transaction: (fn: (tx: unknown) => unknown) => fn(tx) },
    }));
    findUniqueInvoice.mockReset();
    createItem.mockReset().mockResolvedValue({});
    updateInvoice.mockReset().mockImplementation(({ data }: { data: unknown }) => data);
  });

  it("PAID invoice + novo débito: cria um item de ajuste sem alterar o valor original, e recalcula o total", async () => {
    findUniqueInvoice.mockResolvedValueOnce({
      id: "invoice-1",
      status: "PAID",
      paidAmount: 900,
      items: [{ amount: 900 }],
    });

    const { applyInvoiceAdjustment } = await import("./financial");
    const result = (await applyInvoiceAdjustment("invoice-1", "DEBIT", "Excedente identificado posteriormente", 20)) as unknown as {
      totalAmount: number;
      status: string;
    };

    expect(createItem).toHaveBeenCalledWith({
      data: { invoiceId: "invoice-1", type: "DEBIT", description: "Excedente identificado posteriormente", amount: 20 },
    });
    expect(result.totalAmount).toBe(920);
    expect(result.status).toBe("PARTIALLY_PAID"); // paidAmount (900) < novo total (920)
  });

  it("PAID invoice + CREDIT: reduz o total sem alterar o valor pago (a família fica com saldo credor)", async () => {
    findUniqueInvoice.mockResolvedValueOnce({
      id: "invoice-1",
      status: "PAID",
      paidAmount: 900,
      items: [{ amount: 900 }],
    });

    const { applyInvoiceAdjustment } = await import("./financial");
    const result = (await applyInvoiceAdjustment("invoice-1", "CREDIT", "Desconto concedido após o fechamento", 30)) as unknown as {
      totalAmount: number;
      status: string;
    };

    expect(result.totalAmount).toBe(870); // 900 - 30
    const saldo = Math.round((result.totalAmount - 900) * 100) / 100;
    expect(saldo).toBe(-30); // pago (900) supera o novo total (870) em R$30
    expect(result.status).toBe("PAID"); // paidAmount (900) >= novo total (870)
  });

  it("PARTIALLY_PAID + DEBIT: aumenta o total e o saldo devedor, sem tocar o valor já pago", async () => {
    findUniqueInvoice.mockResolvedValueOnce({
      id: "invoice-1",
      status: "PARTIALLY_PAID",
      paidAmount: 500,
      items: [{ amount: 900 }],
    });

    const { applyInvoiceAdjustment } = await import("./financial");
    const result = (await applyInvoiceAdjustment("invoice-1", "DEBIT", "Excedente identificado posteriormente", 50)) as unknown as {
      totalAmount: number;
      status: string;
    };

    expect(result.totalAmount).toBe(950); // 900 + 50
    const saldo = Math.round((result.totalAmount - 500) * 100) / 100;
    expect(saldo).toBe(450); // 950 - 500 pago
    expect(result.status).toBe("PARTIALLY_PAID");
  });

  it("PARTIALLY_PAID + CREDIT: reduz o total e o saldo devedor, sem tocar o valor já pago", async () => {
    findUniqueInvoice.mockResolvedValueOnce({
      id: "invoice-1",
      status: "PARTIALLY_PAID",
      paidAmount: 500,
      items: [{ amount: 900 }],
    });

    const { applyInvoiceAdjustment } = await import("./financial");
    const result = (await applyInvoiceAdjustment("invoice-1", "CREDIT", "Desconto concedido após o fechamento", 100)) as unknown as {
      totalAmount: number;
      status: string;
    };

    expect(result.totalAmount).toBe(800); // 900 - 100
    const saldo = Math.round((result.totalAmount - 500) * 100) / 100;
    expect(saldo).toBe(300); // 800 - 500 pago
    expect(result.status).toBe("PARTIALLY_PAID");
  });

  it("CREDIT sempre entra negativo mesmo se o valor informado for positivo", async () => {
    findUniqueInvoice.mockResolvedValueOnce({ id: "invoice-1", status: "PENDING", paidAmount: 0, items: [{ amount: 900 }] });

    const { applyInvoiceAdjustment } = await import("./financial");
    await applyInvoiceAdjustment("invoice-1", "CREDIT", "Desconto por atraso da escola", 30);

    expect(createItem).toHaveBeenCalledWith({
      data: { invoiceId: "invoice-1", type: "CREDIT", description: "Desconto por atraso da escola", amount: -30 },
    });
  });

  it("recusa ajuste em cobrança CANCELLED", async () => {
    findUniqueInvoice.mockResolvedValueOnce({ id: "invoice-1", status: "CANCELLED", paidAmount: 0, items: [] });

    const { applyInvoiceAdjustment } = await import("./financial");
    await expect(applyInvoiceAdjustment("invoice-1", "DEBIT", "x", 10)).rejects.toThrow(
      "Não é possível lançar ajustes em uma cobrança cancelada."
    );
    expect(createItem).not.toHaveBeenCalled();
  });
});

describe("cancelInvoice", () => {
  const findUniqueInvoice = vi.fn();
  const updateInvoice = vi.fn();

  beforeEach(() => {
    vi.resetModules();
    vi.doMock("@/lib/prisma", () => ({
      prisma: {
        monthlyInvoice: {
          findUnique: (...args: unknown[]) => findUniqueInvoice(...args),
          update: (...args: unknown[]) => updateInvoice(...args),
        },
      },
    }));
    findUniqueInvoice.mockReset();
    updateInvoice.mockReset().mockResolvedValue({ status: "CANCELLED" });
  });

  it("cancela uma cobrança sem pagamentos", async () => {
    findUniqueInvoice.mockResolvedValueOnce({ id: "invoice-1", status: "PENDING", paidAmount: 0 });

    const { cancelInvoice } = await import("./financial");
    await cancelInvoice("invoice-1");
    expect(updateInvoice).toHaveBeenCalledWith({ where: { id: "invoice-1" }, data: { status: "CANCELLED" } });
  });

  it("recusa cancelar uma cobrança com pagamentos registrados", async () => {
    findUniqueInvoice.mockResolvedValueOnce({ id: "invoice-1", status: "PARTIALLY_PAID", paidAmount: 100 });

    const { cancelInvoice } = await import("./financial");
    await expect(cancelInvoice("invoice-1")).rejects.toThrow(/estorno/);
    expect(updateInvoice).not.toHaveBeenCalled();
  });

  it("recusa cancelar uma cobrança já cancelada", async () => {
    findUniqueInvoice.mockResolvedValueOnce({ id: "invoice-1", status: "CANCELLED", paidAmount: 0 });

    const { cancelInvoice } = await import("./financial");
    await expect(cancelInvoice("invoice-1")).rejects.toThrow("já está cancelada");
    expect(updateInvoice).not.toHaveBeenCalled();
  });
});
