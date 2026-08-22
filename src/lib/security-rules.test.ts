import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Testes de segurança "ponta a ponta" (autorização + isolamento entre crianças), conforme pedido: cada bloco
 * cobre uma das regras críticas de acesso, exercitando a camada real (authz.ts ou a Server Action), não uma
 * reimplementação da regra.
 */

describe("cuidadora não executa operação administrativa (requireAdmin)", () => {
  const auth = vi.fn();

  beforeEach(() => {
    vi.resetModules();
    vi.doMock("@/auth", () => ({ auth: (...args: unknown[]) => auth(...args) }));
    vi.doMock("@/lib/prisma", () => ({ prisma: {} }));
    auth.mockReset();
  });

  it("recusa uma sessão de CAREGIVER tentando uma ação de ADMIN", async () => {
    auth.mockResolvedValue({ user: { id: "caregiver-1", role: "CAREGIVER" } });
    const { requireAdmin } = await import("./authz");
    await expect(requireAdmin()).rejects.toThrow("Você não tem permissão para realizar esta operação.");
  });
});

describe("responsável não acessa outra criança (requireGuardianChild)", () => {
  const auth = vi.fn();
  const findUniqueGuardian = vi.fn();
  const findUniqueGuardianChild = vi.fn();

  beforeEach(() => {
    vi.resetModules();
    vi.doMock("@/auth", () => ({ auth: (...args: unknown[]) => auth(...args) }));
    vi.doMock("@/lib/prisma", () => ({
      prisma: {
        guardian: { findUnique: (...args: unknown[]) => findUniqueGuardian(...args) },
        guardianChild: { findUnique: (...args: unknown[]) => findUniqueGuardianChild(...args) },
      },
    }));
    auth.mockReset().mockResolvedValue({ user: { id: "guardian-user-1", role: "GUARDIAN" } });
    findUniqueGuardian.mockReset().mockResolvedValue({ id: "guardian-1", userId: "guardian-user-1" });
    findUniqueGuardianChild.mockReset();
  });

  it("recusa o acesso quando não existe vínculo GuardianChild para a criança pedida", async () => {
    findUniqueGuardianChild.mockResolvedValueOnce(null); // criança de outra família
    const { requireGuardianChild } = await import("./authz");
    await expect(requireGuardianChild("child-de-outra-familia")).rejects.toThrow(
      "Você não tem acesso a esta criança."
    );
  });

  it("permite o acesso quando o vínculo existe", async () => {
    findUniqueGuardianChild.mockResolvedValueOnce({ guardianId: "guardian-1", childId: "child-1", viewRoutine: true });
    const { requireGuardianChild } = await import("./authz");
    await expect(requireGuardianChild("child-1")).resolves.toMatchObject({ guardian: { id: "guardian-1" } });
  });
});

describe("pessoa não autorizada não pode retirar (requireAuthorizedPickupPerson)", () => {
  const auth = vi.fn();
  const findUniqueChild = vi.fn();
  const findFirstAuthorizedPerson = vi.fn();

  beforeEach(() => {
    vi.resetModules();
    vi.doMock("@/auth", () => ({ auth: (...args: unknown[]) => auth(...args) }));
    vi.doMock("@/lib/prisma", () => ({
      prisma: {
        child: { findUnique: (...args: unknown[]) => findUniqueChild(...args) },
        authorizedPickupPerson: { findFirst: (...args: unknown[]) => findFirstAuthorizedPerson(...args) },
      },
    }));
    auth.mockReset().mockResolvedValue({ user: { id: "caregiver-1", role: "CAREGIVER" } });
    findUniqueChild.mockReset().mockResolvedValue({ id: "child-1", status: "ACTIVE" });
    findFirstAuthorizedPerson.mockReset();
  });

  it("recusa retirada por uma pessoa que não está cadastrada/ativa para esta criança", async () => {
    findFirstAuthorizedPerson.mockResolvedValueOnce(null); // não achou: ou não existe, ou é de outra criança, ou está INACTIVE
    const { requireAuthorizedPickupPerson } = await import("./authz");
    await expect(requireAuthorizedPickupPerson("child-1", "AUTHORIZED", "pessoa-nao-cadastrada")).rejects.toThrow(
      "Pessoa não autorizada para retirar esta criança."
    );
  });

  it("permite quando a pessoa está cadastrada e ativa para esta criança", async () => {
    findFirstAuthorizedPerson.mockResolvedValueOnce({ id: "person-1", name: "Ana", relationship: "AUNT" });
    const { requireAuthorizedPickupPerson } = await import("./authz");
    await expect(requireAuthorizedPickupPerson("child-1", "AUTHORIZED", "person-1")).resolves.toMatchObject({
      person: { id: "person-1" },
    });
  });
});

describe("medicamento inválido é bloqueado (addMedicationAdministrationAction)", () => {
  const requireCaregiverChild = vi.fn();
  const findUniqueAuthorization = vi.fn();
  const createAdministration = vi.fn();

  beforeEach(() => {
    vi.resetModules();
    vi.doMock("next/cache", () => ({ revalidatePath: () => {} }));
    vi.doMock("@/lib/authz", () => ({
      requireCaregiverChild: (...args: unknown[]) => requireCaregiverChild(...args),
    }));
    vi.doMock("@/lib/prisma", () => ({
      prisma: {
        medicationAuthorization: { findUnique: (...args: unknown[]) => findUniqueAuthorization(...args) },
        medicationAdministration: { create: (...args: unknown[]) => createAdministration(...args) },
      },
    }));
    requireCaregiverChild.mockReset().mockResolvedValue({ user: { id: "caregiver-1" }, child: { id: "child-1" } });
    findUniqueAuthorization.mockReset();
    createAdministration.mockReset();
  });

  function formData(authorizationId: string) {
    const fd = new FormData();
    fd.set("childId", "child-1");
    fd.set("authorizationId", authorizationId);
    return fd;
  }

  it("recusa quando a autorização não existe", async () => {
    findUniqueAuthorization.mockResolvedValueOnce(null);
    const { addMedicationAdministrationAction } = await import("@/app/cuidadora/criancas/[id]/actions");
    await expect(addMedicationAdministrationAction(formData("auth-inexistente"))).rejects.toThrow(
      "Autorização de medicamento inválida."
    );
    expect(createAdministration).not.toHaveBeenCalled();
  });

  it("recusa quando a autorização pertence a outra criança", async () => {
    findUniqueAuthorization.mockResolvedValueOnce({ id: "auth-1", childId: "child-2", active: true, validFrom: new Date(2020, 0, 1), validUntil: null });
    const { addMedicationAdministrationAction } = await import("@/app/cuidadora/criancas/[id]/actions");
    await expect(addMedicationAdministrationAction(formData("auth-1"))).rejects.toThrow(
      "Autorização de medicamento inválida."
    );
    expect(createAdministration).not.toHaveBeenCalled();
  });

  it("recusa quando a autorização já não está mais vigente", async () => {
    findUniqueAuthorization.mockResolvedValueOnce({
      id: "auth-1",
      childId: "child-1",
      active: true,
      validFrom: new Date(2020, 0, 1),
      validUntil: new Date(2020, 0, 2), // expirada
    });
    const { addMedicationAdministrationAction } = await import("@/app/cuidadora/criancas/[id]/actions");
    await expect(addMedicationAdministrationAction(formData("auth-1"))).rejects.toThrow(
      "A autorização deste medicamento não está vigente."
    );
    expect(createAdministration).not.toHaveBeenCalled();
  });

  it("permite quando a autorização é válida, ativa e da mesma criança", async () => {
    findUniqueAuthorization.mockResolvedValueOnce({
      id: "auth-1",
      childId: "child-1",
      active: true,
      validFrom: new Date(2020, 0, 1),
      validUntil: null,
    });
    createAdministration.mockResolvedValueOnce({ id: "adm-1" });
    const { addMedicationAdministrationAction } = await import("@/app/cuidadora/criancas/[id]/actions");
    await addMedicationAdministrationAction(formData("auth-1"));
    expect(createAdministration).toHaveBeenCalledOnce();
  });
});

describe("cobrança de outra criança não pode ser manipulada (registerPaymentAction)", () => {
  const requireAdmin = vi.fn();
  const findUniqueInvoice = vi.fn();
  const recordAuditLog = vi.fn();
  const createPayment = vi.fn();
  const updateInvoice = vi.fn();

  const tx = {
    payment: { create: (...args: unknown[]) => createPayment(...args) },
    monthlyInvoice: {
      findUnique: (...args: unknown[]) => findUniqueInvoice(...args),
      update: (...args: unknown[]) => updateInvoice(...args),
    },
  };

  beforeEach(() => {
    vi.resetModules();
    vi.doMock("next/cache", () => ({ revalidatePath: () => {} }));
    vi.doMock("@/lib/authz", () => ({ requireAdmin: (...args: unknown[]) => requireAdmin(...args) }));
    vi.doMock("@/lib/audit-log", () => ({ recordAuditLog: (...args: unknown[]) => recordAuditLog(...args) }));
    vi.doMock("@/lib/prisma", () => ({
      prisma: { $transaction: (fn: (tx: unknown) => unknown) => fn(tx) },
    }));
    requireAdmin.mockReset().mockResolvedValue({ id: "admin-1" });
    findUniqueInvoice.mockReset();
    recordAuditLog.mockReset().mockResolvedValue(undefined);
    createPayment.mockReset();
    updateInvoice.mockReset();
  });

  function formData(childId: string) {
    const fd = new FormData();
    fd.set("invoiceId", "invoice-1");
    fd.set("childId", childId);
    fd.set("amount", "50");
    return fd;
  }

  it("recusa registrar pagamento quando o childId informado não é o dono da cobrança", async () => {
    findUniqueInvoice.mockResolvedValueOnce({
      id: "invoice-1",
      childId: "child-A", // a cobrança é da criança A...
      status: "PENDING",
      totalAmount: 900,
      paidAmount: 0,
    });

    const { registerPaymentAction } = await import("@/app/admin/financeiro/actions");
    // ...mas a Server Action foi chamada informando a criança B (childId adulterado/errado no form)
    await expect(registerPaymentAction(formData("child-B"))).rejects.toThrow(
      "Cobrança não encontrada para esta criança."
    );
    expect(createPayment).not.toHaveBeenCalled();
    expect(updateInvoice).not.toHaveBeenCalled();
  });

  it("permite registrar pagamento quando o childId corresponde à cobrança", async () => {
    findUniqueInvoice.mockResolvedValueOnce({
      id: "invoice-1",
      childId: "child-A",
      status: "PENDING",
      totalAmount: 900,
      paidAmount: 0,
    });
    createPayment.mockResolvedValueOnce({ id: "payment-1" });

    const { registerPaymentAction } = await import("@/app/admin/financeiro/actions");
    await registerPaymentAction(formData("child-A"));
    expect(createPayment).toHaveBeenCalledOnce();
    expect(updateInvoice).toHaveBeenCalledOnce();
    expect(recordAuditLog).toHaveBeenCalledWith(expect.objectContaining({ entity: "Payment" }));
  });
});

describe("fechamento de mês gera AuditLog (closeMonthAction)", () => {
  const requireAdmin = vi.fn();
  const findUniqueChild = vi.fn();
  const recordAuditLog = vi.fn();
  const notifyGuardians = vi.fn();
  const tx = {
    monthlyInvoice: {
      findUnique: vi.fn().mockResolvedValue(null),
      upsert: vi.fn().mockResolvedValue({ id: "invoice-1" }),
      findUniqueOrThrow: vi.fn().mockResolvedValue({ id: "invoice-1", totalAmount: 900, overtimeTotal: 0, items: [] }),
    },
    child: {
      findUniqueOrThrow: vi.fn().mockResolvedValue({
        id: "child-1",
        monthlyFee: 900,
        overtimeHourRate: 15,
        contractedExitTime: "17:30",
        toleranceMinutes: 15,
        dueDay: 5,
      }),
    },
    attendance: { findMany: vi.fn().mockResolvedValue([]) },
    invoiceItem: { deleteMany: vi.fn().mockResolvedValue({ count: 0 }), createMany: vi.fn().mockResolvedValue({ count: 0 }) },
  };

  beforeEach(() => {
    vi.resetModules();
    vi.doMock("next/cache", () => ({ revalidatePath: () => {} }));
    vi.doMock("@/lib/authz", () => ({ requireAdmin: (...args: unknown[]) => requireAdmin(...args) }));
    vi.doMock("@/lib/audit-log", () => ({ recordAuditLog: (...args: unknown[]) => recordAuditLog(...args) }));
    vi.doMock("@/lib/notifications", () => ({ notifyGuardians: (...args: unknown[]) => notifyGuardians(...args) }));
    vi.doMock("@/lib/prisma", () => ({
      prisma: {
        child: { findUnique: (...args: unknown[]) => findUniqueChild(...args) },
        $transaction: (fn: (tx: unknown) => unknown) => fn(tx),
      },
    }));
    requireAdmin.mockReset().mockResolvedValue({ id: "admin-1" });
    findUniqueChild.mockReset().mockResolvedValue({ id: "child-1", status: "ACTIVE" });
    recordAuditLog.mockReset().mockResolvedValue(undefined);
    notifyGuardians.mockReset().mockResolvedValue(undefined);
  });

  it("fechar o mês registra um AuditLog com o total calculado", async () => {
    const fd = new FormData();
    fd.set("childId", "child-1");
    fd.set("month", "9");
    fd.set("year", "2026");

    const { closeMonthAction } = await import("@/app/admin/financeiro/actions");
    await closeMonthAction(fd);

    expect(recordAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ entity: "MonthlyInvoice", action: "CLOSE_MONTH" })
    );
  });
});

describe("cancelamento de cobrança gera AuditLog (cancelInvoiceAction)", () => {
  const requireAdmin = vi.fn();
  const findUniqueInvoice = vi.fn();
  const updateInvoice = vi.fn();
  const recordAuditLog = vi.fn();

  beforeEach(() => {
    vi.resetModules();
    vi.doMock("next/cache", () => ({ revalidatePath: () => {} }));
    vi.doMock("@/lib/authz", () => ({ requireAdmin: (...args: unknown[]) => requireAdmin(...args) }));
    vi.doMock("@/lib/audit-log", () => ({ recordAuditLog: (...args: unknown[]) => recordAuditLog(...args) }));
    vi.doMock("@/lib/prisma", () => ({
      prisma: { monthlyInvoice: { findUnique: (...args: unknown[]) => findUniqueInvoice(...args) } },
    }));
    requireAdmin.mockReset().mockResolvedValue({ id: "admin-1" });
    findUniqueInvoice.mockReset();
    updateInvoice.mockReset();
    recordAuditLog.mockReset().mockResolvedValue(undefined);
  });

  it("cancelar uma cobrança registra um AuditLog com action CANCEL", async () => {
    // cancelInvoiceAction e cancelInvoice() (em src/lib/financial.ts) fazem cada um seu próprio findUnique —
    // mockResolvedValue (não Once) cobre as duas chamadas com o mesmo estado.
    findUniqueInvoice.mockResolvedValue({ id: "invoice-1", childId: "child-1", status: "PENDING", paidAmount: 0 });
    // cancelInvoice() (src/lib/financial.ts) faz seu próprio findUnique/update reais — mockamos o módulo
    // inteiro de prisma de forma mínima o bastante para o cenário; o update precisa existir.
    vi.doMock("@/lib/prisma", () => ({
      prisma: {
        monthlyInvoice: {
          findUnique: (...args: unknown[]) => findUniqueInvoice(...args),
          update: (...args: unknown[]) => updateInvoice(...args),
        },
      },
    }));
    vi.resetModules();
    updateInvoice.mockResolvedValueOnce({ id: "invoice-1", status: "CANCELLED" });

    const fd = new FormData();
    fd.set("invoiceId", "invoice-1");
    fd.set("childId", "child-1");

    const { cancelInvoiceAction } = await import("@/app/admin/financeiro/actions");
    await cancelInvoiceAction(fd);

    expect(recordAuditLog).toHaveBeenCalledWith(expect.objectContaining({ entity: "MonthlyInvoice", action: "CANCEL" }));
  });
});

describe("eventos de rotina não geram AuditLog administrativo (addMedicationAdministrationAction)", () => {
  const requireCaregiverChild = vi.fn();
  const findUniqueAuthorization = vi.fn();
  const createAdministration = vi.fn();
  const recordAuditLog = vi.fn();

  beforeEach(() => {
    vi.resetModules();
    vi.doMock("next/cache", () => ({ revalidatePath: () => {} }));
    vi.doMock("@/lib/authz", () => ({
      requireCaregiverChild: (...args: unknown[]) => requireCaregiverChild(...args),
    }));
    // Espiona recordAuditLog só para provar que uma Server Action puramente operacional nunca a chama —
    // cuidadora/criancas/[id]/actions.ts nem importa "@/lib/audit-log" hoje; este teste é uma trava de regressão.
    vi.doMock("@/lib/audit-log", () => ({ recordAuditLog: (...args: unknown[]) => recordAuditLog(...args) }));
    vi.doMock("@/lib/prisma", () => ({
      prisma: {
        medicationAuthorization: { findUnique: (...args: unknown[]) => findUniqueAuthorization(...args) },
        medicationAdministration: { create: (...args: unknown[]) => createAdministration(...args) },
      },
    }));
    requireCaregiverChild.mockReset().mockResolvedValue({ user: { id: "caregiver-1" }, child: { id: "child-1" } });
    findUniqueAuthorization.mockReset().mockResolvedValue({
      id: "auth-1",
      childId: "child-1",
      active: true,
      validFrom: new Date(2020, 0, 1),
      validUntil: null,
    });
    createAdministration.mockReset().mockResolvedValue({ id: "adm-1" });
    recordAuditLog.mockReset().mockResolvedValue(undefined);
  });

  it("registrar administração de medicamento não gera entrada de AuditLog", async () => {
    const fd = new FormData();
    fd.set("childId", "child-1");
    fd.set("authorizationId", "auth-1");

    const { addMedicationAdministrationAction } = await import("@/app/cuidadora/criancas/[id]/actions");
    await addMedicationAdministrationAction(fd);

    expect(createAdministration).toHaveBeenCalledOnce();
    expect(recordAuditLog).not.toHaveBeenCalled();
  });
});
