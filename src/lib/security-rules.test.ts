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

describe("responsável sem permissão específica não acessa a seção (requireGuardianChildPermission)", () => {
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

  it("recusa acesso ao financeiro quando viewFinancial é false, mesmo com vínculo válido com a criança", async () => {
    findUniqueGuardianChild.mockResolvedValueOnce({ guardianId: "guardian-1", childId: "child-1", viewFinancial: false });
    const { requireGuardianChildPermission } = await import("./authz");
    await expect(requireGuardianChildPermission("child-1", "viewFinancial")).rejects.toThrow(
      "Você não tem permissão para acessar esta criança."
    );
  });

  it("recusa acesso a fotos quando viewPhotos é false", async () => {
    findUniqueGuardianChild.mockResolvedValueOnce({ guardianId: "guardian-1", childId: "child-1", viewPhotos: false });
    const { requireGuardianChildPermission } = await import("./authz");
    await expect(requireGuardianChildPermission("child-1", "viewPhotos")).rejects.toThrow(
      "Você não tem permissão para acessar esta criança."
    );
  });

  it("permite quando a permissão específica está ativa", async () => {
    findUniqueGuardianChild.mockResolvedValueOnce({ guardianId: "guardian-1", childId: "child-1", viewFinancial: true });
    const { requireGuardianChildPermission } = await import("./authz");
    await expect(requireGuardianChildPermission("child-1", "viewFinancial")).resolves.toMatchObject({
      guardian: { id: "guardian-1" },
    });
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
  const notifyGuardians = vi.fn();
  const notifyAdmins = vi.fn();

  beforeEach(() => {
    vi.resetModules();
    vi.doMock("next/cache", () => ({ revalidatePath: () => {} }));
    vi.doMock("@/lib/authz", () => ({
      requireCaregiverChild: (...args: unknown[]) => requireCaregiverChild(...args),
    }));
    vi.doMock("@/lib/notifications", () => ({
      notifyGuardians: (...args: unknown[]) => notifyGuardians(...args),
      notifyAdmins: (...args: unknown[]) => notifyAdmins(...args),
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
    notifyGuardians.mockReset().mockResolvedValue(undefined);
    notifyAdmins.mockReset().mockResolvedValue(undefined);
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
      medication: "Paracetamol",
      active: true,
      validFrom: new Date(2020, 0, 1),
      validUntil: null,
    });
    createAdministration.mockResolvedValueOnce({ id: "adm-1", child: { preferredName: "Maria", fullName: "Maria Silva" } });
    const { addMedicationAdministrationAction } = await import("@/app/cuidadora/criancas/[id]/actions");
    await addMedicationAdministrationAction(formData("auth-1"));
    expect(createAdministration).toHaveBeenCalledOnce();
    expect(notifyGuardians).toHaveBeenCalledWith(
      "child-1",
      "MEDICATION",
      "Medicamento administrado",
      "Há uma atualização sobre a medicação de Maria."
    );
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
    // cancelInvoiceAction e cancelInvoice() (em src/lib/financial.ts) fazem cada um seu próprio
    // findUnique/update — o mock precisa cobrir os dois desde o início, sem re-registrar no meio do teste.
    vi.doMock("@/lib/prisma", () => ({
      prisma: {
        monthlyInvoice: {
          findUnique: (...args: unknown[]) => findUniqueInvoice(...args),
          update: (...args: unknown[]) => updateInvoice(...args),
        },
      },
    }));
    requireAdmin.mockReset().mockResolvedValue({ id: "admin-1" });
    findUniqueInvoice.mockReset();
    updateInvoice.mockReset();
    recordAuditLog.mockReset().mockResolvedValue(undefined);
  });

  it("cancelar uma cobrança registra um AuditLog com action CANCEL", async () => {
    // mockResolvedValue (não Once) cobre as duas chamadas (cancelInvoiceAction + cancelInvoice) com o mesmo estado.
    findUniqueInvoice.mockResolvedValue({ id: "invoice-1", childId: "child-1", status: "PENDING", paidAmount: 0 });
    updateInvoice.mockResolvedValueOnce({ id: "invoice-1", status: "CANCELLED" });

    const fd = new FormData();
    fd.set("invoiceId", "invoice-1");
    fd.set("childId", "child-1");

    const { cancelInvoiceAction } = await import("@/app/admin/financeiro/actions");
    await cancelInvoiceAction(fd);

    expect(recordAuditLog).toHaveBeenCalledWith(expect.objectContaining({ entity: "MonthlyInvoice", action: "CANCEL" }));
  });
});

describe("check-in preserva ID relacional e snapshot de nome/parentesco (checkInAction)", () => {
  const requireAuthorizedPickupPerson = vi.fn();
  const findUniqueAttendance = vi.fn();
  const createAttendance = vi.fn();
  const notifyGuardians = vi.fn();
  const recordAuditLog = vi.fn();

  beforeEach(() => {
    vi.resetModules();
    vi.doMock("next/cache", () => ({ revalidatePath: () => {} }));
    vi.doMock("@/lib/notifications", () => ({ notifyGuardians: (...args: unknown[]) => notifyGuardians(...args) }));
    vi.doMock("@/lib/authz", () => ({
      requireAuthorizedPickupPerson: (...args: unknown[]) => requireAuthorizedPickupPerson(...args),
    }));
    vi.doMock("@/lib/audit-log", () => ({ recordAuditLog: (...args: unknown[]) => recordAuditLog(...args) }));
    vi.doMock("@/lib/prisma", () => ({
      prisma: {
        attendance: {
          findUnique: (...args: unknown[]) => findUniqueAttendance(...args),
          create: (...args: unknown[]) => createAttendance(...args),
        },
      },
    }));
    requireAuthorizedPickupPerson.mockReset().mockResolvedValue({
      user: { id: "caregiver-1" },
      person: { id: "guardian-1", name: "Maria Silva", relationship: "MOTHER" },
    });
    findUniqueAttendance.mockReset().mockResolvedValue(null);
    createAttendance.mockReset().mockResolvedValue({
      id: "att-1",
      checkInTime: new Date(2026, 7, 26, 8, 0),
      child: { preferredName: null, fullName: "Criança" },
    });
    notifyGuardians.mockReset().mockResolvedValue(undefined);
    recordAuditLog.mockReset().mockResolvedValue(undefined);
  });

  it("grava checkInGuardianId (relacional) junto do snapshot checkInPersonName/checkInPersonRelation", async () => {
    const fd = new FormData();
    fd.set("childId", "child-1");
    fd.set("personRef", "GUARDIAN:guardian-1");

    const { checkInAction } = await import("@/app/cuidadora/actions");
    await checkInAction(fd);

    expect(createAttendance).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          checkInGuardianId: "guardian-1",
          checkInAuthorizedPickupPersonId: null,
          checkInPersonName: "Maria Silva",
          checkInPersonRelation: "MOTHER",
        }),
      })
    );
  });

  it("grava AuditLog CHILD_CHECK_IN com o autor e a pessoa que buscou a criança", async () => {
    const fd = new FormData();
    fd.set("childId", "child-1");
    fd.set("personRef", "GUARDIAN:guardian-1");

    const { checkInAction } = await import("@/app/cuidadora/actions");
    await checkInAction(fd);

    expect(recordAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: "caregiver-1",
        action: "CHILD_CHECK_IN",
        entity: "Attendance",
        entityId: "att-1",
        newData: expect.objectContaining({ childId: "child-1", personName: "Maria Silva", personType: "GUARDIAN" }),
      })
    );
  });
});

describe("saída de criança gera AuditLog (checkOutAction)", () => {
  const requireAuthorizedPickupPerson = vi.fn();
  const findUniqueAttendance = vi.fn();
  const updateAttendance = vi.fn();
  const notifyGuardians = vi.fn();
  const recordAuditLog = vi.fn();

  beforeEach(() => {
    vi.resetModules();
    vi.doMock("next/cache", () => ({ revalidatePath: () => {} }));
    vi.doMock("@/lib/notifications", () => ({ notifyGuardians: (...args: unknown[]) => notifyGuardians(...args) }));
    vi.doMock("@/lib/authz", () => ({
      requireAuthorizedPickupPerson: (...args: unknown[]) => requireAuthorizedPickupPerson(...args),
    }));
    vi.doMock("@/lib/audit-log", () => ({ recordAuditLog: (...args: unknown[]) => recordAuditLog(...args) }));
    vi.doMock("@/lib/prisma", () => ({
      prisma: {
        attendance: {
          findUnique: (...args: unknown[]) => findUniqueAttendance(...args),
          update: (...args: unknown[]) => updateAttendance(...args),
        },
      },
    }));
    requireAuthorizedPickupPerson.mockReset().mockResolvedValue({
      user: { id: "caregiver-1" },
      person: { id: "guardian-1", name: "Maria Silva", relationship: "MOTHER" },
    });
    findUniqueAttendance.mockReset().mockResolvedValue({
      id: "att-1",
      checkInTime: new Date(2026, 7, 26, 8, 0),
      checkOutTime: null,
      checkOutPersonName: null,
    });
    updateAttendance.mockReset().mockResolvedValue({
      id: "att-1",
      checkOutTime: new Date(2026, 7, 26, 18, 0),
      child: { preferredName: null, fullName: "Criança" },
    });
    notifyGuardians.mockReset().mockResolvedValue(undefined);
    recordAuditLog.mockReset().mockResolvedValue(undefined);
  });

  it("grava AuditLog CHILD_CHECK_OUT com o autor e a pessoa que retirou a criança", async () => {
    const fd = new FormData();
    fd.set("childId", "child-1");
    fd.set("personRef", "GUARDIAN:guardian-1");

    const { checkOutAction } = await import("@/app/cuidadora/actions");
    await checkOutAction(fd);

    expect(recordAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: "caregiver-1",
        action: "CHILD_CHECK_OUT",
        entity: "Attendance",
        entityId: "att-1",
        newData: expect.objectContaining({ childId: "child-1", personName: "Maria Silva", personType: "GUARDIAN" }),
      })
    );
  });

  it("recusa registrar saída antes da chegada, sem gravar AuditLog", async () => {
    findUniqueAttendance.mockResolvedValueOnce({ id: "att-1", checkInTime: null, checkOutTime: null });
    const fd = new FormData();
    fd.set("childId", "child-1");
    fd.set("personRef", "GUARDIAN:guardian-1");

    const { checkOutAction } = await import("@/app/cuidadora/actions");
    await expect(checkOutAction(fd)).rejects.toThrow("Não é possível registrar a saída antes da chegada da criança.");

    expect(updateAttendance).not.toHaveBeenCalled();
    expect(recordAuditLog).not.toHaveBeenCalled();
  });
});

describe("criação de criança gera AuditLog (createChildAction)", () => {
  const requireAdmin = vi.fn();
  const createChild = vi.fn();
  const recordAuditLog = vi.fn();

  beforeEach(() => {
    vi.resetModules();
    vi.doMock("next/navigation", () => ({ redirect: () => {} }));
    vi.doMock("@/lib/authz", () => ({ requireAdmin: (...args: unknown[]) => requireAdmin(...args) }));
    vi.doMock("@/lib/audit-log", () => ({ recordAuditLog: (...args: unknown[]) => recordAuditLog(...args) }));
    vi.doMock("@/lib/prisma", () => ({ prisma: { child: { create: (...args: unknown[]) => createChild(...args) } } }));
    requireAdmin.mockReset().mockResolvedValue({ id: "admin-1" });
    createChild.mockReset().mockResolvedValue({ id: "child-1", fullName: "Maria" });
    recordAuditLog.mockReset().mockResolvedValue(undefined);
  });

  it("cadastrar uma criança registra um AuditLog com entity Child", async () => {
    const fd = new FormData();
    fd.set("fullName", "Maria");
    fd.set("birthDate", "2022-01-01");
    fd.set("monthlyFee", "900");

    const { createChildAction } = await import("@/app/admin/criancas/actions");
    await createChildAction(fd);

    expect(recordAuditLog).toHaveBeenCalledWith(expect.objectContaining({ entity: "Child", action: "CREATE" }));
  });
});

describe("criação de pessoa autorizada gera AuditLog (addAuthorizedPersonAction)", () => {
  const requireAdminChild = vi.fn();
  const findUniqueGuardianChild = vi.fn();
  const createAuthorizedPerson = vi.fn();
  const recordAuditLog = vi.fn();

  beforeEach(() => {
    vi.resetModules();
    vi.doMock("next/cache", () => ({ revalidatePath: () => {} }));
    vi.doMock("@/lib/authz", () => ({ requireAdminChild: (...args: unknown[]) => requireAdminChild(...args) }));
    vi.doMock("@/lib/audit-log", () => ({ recordAuditLog: (...args: unknown[]) => recordAuditLog(...args) }));
    vi.doMock("@/lib/prisma", () => ({
      prisma: {
        guardianChild: { findUnique: (...args: unknown[]) => findUniqueGuardianChild(...args) },
        authorizedPickupPerson: { create: (...args: unknown[]) => createAuthorizedPerson(...args) },
      },
    }));
    requireAdminChild.mockReset().mockResolvedValue({ user: { id: "admin-1" }, child: { id: "child-1" } });
    findUniqueGuardianChild.mockReset().mockResolvedValue({ guardianId: "guardian-1", childId: "child-1" });
    createAuthorizedPerson.mockReset().mockResolvedValue({ id: "person-1" });
    recordAuditLog.mockReset().mockResolvedValue(undefined);
  });

  it("cadastrar uma pessoa autorizada registra um AuditLog com entity AuthorizedPickupPerson", async () => {
    const fd = new FormData();
    fd.set("childId", "child-1");
    fd.set("name", "Ana");
    fd.set("phone", "11999999999");
    fd.set("authorizedByGuardianId", "guardian-1");

    const { addAuthorizedPersonAction } = await import("@/app/admin/criancas/[id]/actions");
    await addAuthorizedPersonAction(fd);

    expect(recordAuditLog).toHaveBeenCalledWith(expect.objectContaining({ entity: "AuthorizedPickupPerson", action: "CREATE" }));
  });
});

describe("administração de medicamento gera AuditLog (addMedicationAdministrationAction)", () => {
  const requireCaregiverChild = vi.fn();
  const findUniqueAuthorization = vi.fn();
  const createAdministration = vi.fn();
  const recordAuditLog = vi.fn();
  const notifyGuardians = vi.fn();
  const notifyAdmins = vi.fn();

  beforeEach(() => {
    vi.resetModules();
    vi.doMock("next/cache", () => ({ revalidatePath: () => {} }));
    vi.doMock("@/lib/authz", () => ({
      requireCaregiverChild: (...args: unknown[]) => requireCaregiverChild(...args),
    }));
    vi.doMock("@/lib/notifications", () => ({
      notifyGuardians: (...args: unknown[]) => notifyGuardians(...args),
      notifyAdmins: (...args: unknown[]) => notifyAdmins(...args),
    }));
    // Medicação é dado de saúde sensível — diferente das demais Server Actions de rotina (alimentação,
    // sono, higiene...), que não geram AuditLog administrativo (só a própria timeline do dia já serve de
    // registro). Ver src/app/cuidadora/criancas/[id]/actions.test.ts para as demais.
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
      medication: "Paracetamol",
      active: true,
      validFrom: new Date(2020, 0, 1),
      validUntil: null,
    });
    createAdministration.mockReset().mockResolvedValue({ id: "adm-1", child: { preferredName: "Maria", fullName: "Maria Silva" } });
    recordAuditLog.mockReset().mockResolvedValue(undefined);
    notifyGuardians.mockReset().mockResolvedValue(undefined);
    notifyAdmins.mockReset().mockResolvedValue(undefined);
  });

  it("registrar administração de medicamento grava AuditLog com actor, criança e autorização usadas", async () => {
    const fd = new FormData();
    fd.set("childId", "child-1");
    fd.set("authorizationId", "auth-1");
    fd.set("notes", "Febre 38.2");

    const { addMedicationAdministrationAction } = await import("@/app/cuidadora/criancas/[id]/actions");
    await addMedicationAdministrationAction(fd);

    expect(createAdministration).toHaveBeenCalledOnce();
    expect(recordAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: "caregiver-1",
        action: "ROUTINE_MEDICATION_CREATED",
        entity: "MedicationAdministration",
        entityId: "adm-1",
        newData: expect.objectContaining({ childId: "child-1", authorizationId: "auth-1", notes: "Febre 38.2" }),
      })
    );
  });
});

// Os dois blocos abaixo mockam "@/lib/authz" (só um subconjunto de exports) — colocados por último de
// propósito, para não vazar esse mock parcial para os blocos acima, que precisam do módulo authz.ts real.

describe("cuidadora não altera financeiro (registerPaymentAction usa requireAdmin)", () => {
  const requireAdmin = vi.fn();

  beforeEach(() => {
    vi.resetModules();
    vi.doMock("next/cache", () => ({ revalidatePath: () => {} }));
    vi.doMock("@/lib/authz", () => ({ requireAdmin: (...args: unknown[]) => requireAdmin(...args) }));
    vi.doMock("@/lib/audit-log", () => ({ recordAuditLog: vi.fn() }));
    vi.doMock("@/lib/prisma", () => ({ prisma: { $transaction: vi.fn() } }));
    requireAdmin.mockReset();
  });

  it("recusa registrar pagamento quando quem chama não é ADMIN", async () => {
    requireAdmin.mockRejectedValueOnce(new Error("Você não tem permissão para realizar esta operação."));
    const { registerPaymentAction } = await import("@/app/admin/financeiro/actions");

    const fd = new FormData();
    fd.set("invoiceId", "invoice-1");
    fd.set("childId", "child-1");
    fd.set("amount", "50");

    await expect(registerPaymentAction(fd)).rejects.toThrow("Você não tem permissão para realizar esta operação.");
  });
});

describe("cuidadora nunca pode ser criada como administradora (createCaregiverAction)", () => {
  const requireAdmin = vi.fn();
  const findUniqueUser = vi.fn();
  const createUser = vi.fn();

  beforeEach(() => {
    vi.resetModules();
    vi.doMock("next/cache", () => ({ revalidatePath: () => {} }));
    vi.doMock("@/lib/authz", () => ({ requireAdmin: (...args: unknown[]) => requireAdmin(...args) }));
    vi.doMock("@/lib/audit-log", () => ({ recordAuditLog: vi.fn().mockResolvedValue(undefined) }));
    vi.doMock("@/lib/notifications", () => ({ notifyAdmins: vi.fn().mockResolvedValue(undefined) }));
    vi.doMock("@/lib/user-actions", () => ({ toggleUserActive: vi.fn() }));
    vi.doMock("@/lib/storage", () => ({ uploadFile: vi.fn() }));
    vi.doMock("@/lib/prisma", () => ({
      prisma: {
        user: {
          findUnique: (...args: unknown[]) => findUniqueUser(...args),
          create: (...args: unknown[]) => createUser(...args),
        },
      },
    }));
    requireAdmin.mockReset().mockResolvedValue({ id: "admin-1" });
    findUniqueUser.mockReset().mockResolvedValue(null);
    createUser.mockReset().mockResolvedValue({ id: "caregiver-1", name: "Ana" });
  });

  it("o formulário de cadastro de cuidadora não tem como definir role — sempre grava CAREGIVER", async () => {
    const { createCaregiverAction } = await import("@/app/admin/cuidadoras/actions");
    const fd = new FormData();
    fd.set("name", "Ana");
    fd.set("email", "ana@turminhadatata.com.br");
    fd.set("phone", "11999999999");
    fd.set("tempPassword", "SenhaInicial123");
    // Tentativa de manipular o role diretamente pelo FormData — o campo nem é lido pela action.
    fd.set("role", "ADMIN");

    await createCaregiverAction(undefined, fd);

    expect(createUser).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ role: "CAREGIVER" }) }));
  });
});
