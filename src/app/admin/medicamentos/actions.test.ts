import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Máquina de estados do admin sobre MedicationAuthorization: PENDING → ACTIVE/REFUSED,
 * ACTIVE ↔ PAUSED, ACTIVE/PAUSED → ENDED. Cada transição só é aceita a partir do estado esperado.
 */

const requireAdmin = vi.fn();
const findUniqueAuthorization = vi.fn();
const updateAuthorization = vi.fn();
const recordAuditLog = vi.fn();
const notifyGuardians = vi.fn();

beforeEach(() => {
  vi.resetModules();
  vi.doMock("next/cache", () => ({ revalidatePath: () => {} }));
  vi.doMock("@/lib/authz", () => ({ requireAdmin: (...args: unknown[]) => requireAdmin(...args) }));
  vi.doMock("@/lib/audit-log", () => ({ recordAuditLog: (...args: unknown[]) => recordAuditLog(...args) }));
  vi.doMock("@/lib/notifications", () => ({ notifyGuardians: (...args: unknown[]) => notifyGuardians(...args) }));
  vi.doMock("@/lib/prisma", () => ({
    prisma: {
      medicationAuthorization: {
        findUnique: (...args: unknown[]) => findUniqueAuthorization(...args),
        update: (...args: unknown[]) => updateAuthorization(...args),
      },
    },
  }));

  requireAdmin.mockReset().mockResolvedValue({ id: "admin-1" });
  findUniqueAuthorization.mockReset();
  updateAuthorization.mockReset().mockResolvedValue(undefined);
  recordAuditLog.mockReset().mockResolvedValue(undefined);
  notifyGuardians.mockReset().mockResolvedValue(undefined);
});

function formData(fields: Record<string, string>) {
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) fd.set(key, value);
  return fd;
}

describe("approveMedicationAuthorizationAction", () => {
  it("CASO 1: confirma um medicamento PENDING, marca ACTIVE/active=true e notifica os responsáveis", async () => {
    findUniqueAuthorization.mockResolvedValueOnce({ id: "auth-1", status: "PENDING", childId: "child-1", medication: "Paracetamol" });
    const { approveMedicationAuthorizationAction } = await import("./actions");

    await approveMedicationAuthorizationAction(formData({ id: "auth-1" }));

    expect(updateAuthorization).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "auth-1" },
        data: expect.objectContaining({ status: "ACTIVE", active: true, reviewedByUserId: "admin-1" }),
      })
    );
    expect(recordAuditLog).toHaveBeenCalledWith(expect.objectContaining({ action: "APPROVE", entity: "MedicationAuthorization" }));
    expect(notifyGuardians).toHaveBeenCalledWith("child-1", "MEDICATION", expect.any(String), expect.stringContaining("Paracetamol"));
  });

  it("CASO 2: recusa confirmar um medicamento que não está PENDING", async () => {
    findUniqueAuthorization.mockResolvedValueOnce({ id: "auth-1", status: "ACTIVE", childId: "child-1", medication: "Paracetamol" });
    const { approveMedicationAuthorizationAction } = await import("./actions");

    await expect(approveMedicationAuthorizationAction(formData({ id: "auth-1" }))).rejects.toThrow(
      "Este medicamento não está pendente de confirmação."
    );
    expect(updateAuthorization).not.toHaveBeenCalled();
  });
});

describe("refuseMedicationAuthorizationAction", () => {
  it("CASO 1: exige o motivo da recusa", async () => {
    const { refuseMedicationAuthorizationAction } = await import("./actions");
    await expect(refuseMedicationAuthorizationAction(formData({ id: "auth-1", reason: "" }))).rejects.toThrow(
      "Informe o motivo da recusa."
    );
    expect(findUniqueAuthorization).not.toHaveBeenCalled();
  });

  it("CASO 2: recusa um medicamento PENDING, grava o motivo e notifica os responsáveis", async () => {
    findUniqueAuthorization.mockResolvedValueOnce({ id: "auth-1", status: "PENDING", childId: "child-1", medication: "Paracetamol" });
    const { refuseMedicationAuthorizationAction } = await import("./actions");

    await refuseMedicationAuthorizationAction(formData({ id: "auth-1", reason: "Requer receita médica" }));

    expect(updateAuthorization).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "REFUSED", active: false, reviewNotes: "Requer receita médica" }),
      })
    );
    expect(notifyGuardians).toHaveBeenCalledWith(
      "child-1",
      "MEDICATION",
      expect.any(String),
      expect.stringContaining("Requer receita médica")
    );
  });
});

describe("pauseMedicationAuthorizationAction / resumeMedicationAuthorizationAction", () => {
  it("CASO 1: pausa um medicamento ACTIVE", async () => {
    findUniqueAuthorization.mockResolvedValueOnce({ id: "auth-1", status: "ACTIVE", childId: "child-1" });
    const { pauseMedicationAuthorizationAction } = await import("./actions");

    await pauseMedicationAuthorizationAction(formData({ id: "auth-1" }));

    expect(updateAuthorization).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "PAUSED", active: false }) })
    );
  });

  it("CASO 2: recusa pausar um medicamento que não está ACTIVE", async () => {
    findUniqueAuthorization.mockResolvedValueOnce({ id: "auth-1", status: "PENDING", childId: "child-1" });
    const { pauseMedicationAuthorizationAction } = await import("./actions");

    await expect(pauseMedicationAuthorizationAction(formData({ id: "auth-1" }))).rejects.toThrow(
      "Só é possível pausar um medicamento ativo."
    );
  });

  it("CASO 3: retoma um medicamento PAUSED", async () => {
    findUniqueAuthorization.mockResolvedValueOnce({ id: "auth-1", status: "PAUSED", childId: "child-1" });
    const { resumeMedicationAuthorizationAction } = await import("./actions");

    await resumeMedicationAuthorizationAction(formData({ id: "auth-1" }));

    expect(updateAuthorization).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "ACTIVE", active: true }) })
    );
  });

  it("CASO 4: recusa retomar um medicamento que não está PAUSED", async () => {
    findUniqueAuthorization.mockResolvedValueOnce({ id: "auth-1", status: "ACTIVE", childId: "child-1" });
    const { resumeMedicationAuthorizationAction } = await import("./actions");

    await expect(resumeMedicationAuthorizationAction(formData({ id: "auth-1" }))).rejects.toThrow(
      "Só é possível retomar um medicamento pausado."
    );
  });
});

describe("endMedicationAuthorizationAction", () => {
  it("CASO 1: encerra um medicamento ACTIVE", async () => {
    findUniqueAuthorization.mockResolvedValueOnce({ id: "auth-1", status: "ACTIVE", childId: "child-1" });
    const { endMedicationAuthorizationAction } = await import("./actions");

    await endMedicationAuthorizationAction(formData({ id: "auth-1" }));

    expect(updateAuthorization).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "ENDED", active: false }) })
    );
  });

  it("CASO 2: recusa encerrar um medicamento já encerrado ou recusado", async () => {
    findUniqueAuthorization.mockResolvedValueOnce({ id: "auth-1", status: "ENDED", childId: "child-1" });
    const { endMedicationAuthorizationAction } = await import("./actions");

    await expect(endMedicationAuthorizationAction(formData({ id: "auth-1" }))).rejects.toThrow(
      "Este medicamento já está encerrado."
    );
  });
});
