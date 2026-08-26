import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * requestMedicationAuthorizationAction: nasce sempre PENDING/inativa — o responsável nunca consegue
 * criar um medicamento já ACTIVE (só admin, via src/app/admin/medicamentos/actions.ts, confirma).
 */

const requireGuardianChildPermission = vi.fn();
const createAuthorization = vi.fn();
const recordAuditLog = vi.fn();
const notifyAdmins = vi.fn();

beforeEach(() => {
  vi.resetModules();
  vi.doMock("next/cache", () => ({ revalidatePath: () => {} }));
  vi.doMock("@/lib/authz", () => ({
    requireGuardianChildPermission: (...args: unknown[]) => requireGuardianChildPermission(...args),
  }));
  vi.doMock("@/lib/audit-log", () => ({ recordAuditLog: (...args: unknown[]) => recordAuditLog(...args) }));
  vi.doMock("@/lib/notifications", () => ({ notifyAdmins: (...args: unknown[]) => notifyAdmins(...args) }));
  vi.doMock("@/lib/prisma", () => ({
    prisma: { medicationAuthorization: { create: (...args: unknown[]) => createAuthorization(...args) } },
  }));

  requireGuardianChildPermission.mockReset().mockResolvedValue({
    user: { id: "user-1" },
    guardian: { id: "guardian-1", name: "Maria Silva" },
  });
  createAuthorization.mockReset().mockResolvedValue({
    id: "auth-1",
    child: { preferredName: "Ana", fullName: "Ana Silva" },
  });
  recordAuditLog.mockReset().mockResolvedValue(undefined);
  notifyAdmins.mockReset().mockResolvedValue(undefined);
});

function formData(fields: Record<string, string>) {
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) fd.set(key, value);
  return fd;
}

const validFields = {
  childId: "child-1",
  medication: "Paracetamol",
  dosage: "5ml",
  validFrom: "2026-09-01",
};

describe("requestMedicationAuthorizationAction", () => {
  it("CASO 1: recusa sem nome do medicamento", async () => {
    const { requestMedicationAuthorizationAction } = await import("./actions");
    await expect(requestMedicationAuthorizationAction(formData({ ...validFields, medication: "" }))).rejects.toThrow(
      "Informe o nome do medicamento."
    );
    expect(createAuthorization).not.toHaveBeenCalled();
  });

  it("CASO 2: recusa sem dosagem", async () => {
    const { requestMedicationAuthorizationAction } = await import("./actions");
    await expect(requestMedicationAuthorizationAction(formData({ ...validFields, dosage: "" }))).rejects.toThrow(
      "Informe a dosagem."
    );
  });

  it("CASO 3: recusa sem data de início", async () => {
    const { requestMedicationAuthorizationAction } = await import("./actions");
    await expect(requestMedicationAuthorizationAction(formData({ ...validFields, validFrom: "" }))).rejects.toThrow(
      "Informe a data de início."
    );
  });

  it("CASO 4: recusa data de término anterior à de início", async () => {
    const { requestMedicationAuthorizationAction } = await import("./actions");
    await expect(
      requestMedicationAuthorizationAction(formData({ ...validFields, validFrom: "2026-09-10", validUntil: "2026-09-01" }))
    ).rejects.toThrow("A data de término não pode ser anterior à de início.");
    expect(createAuthorization).not.toHaveBeenCalled();
  });

  it("CASO 5: cria a autorização sempre PENDING e inativa, mesmo com todos os dados válidos", async () => {
    const { requestMedicationAuthorizationAction } = await import("./actions");
    await requestMedicationAuthorizationAction(formData(validFields));

    expect(createAuthorization).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          childId: "child-1",
          medication: "Paracetamol",
          dosage: "5ml",
          authorizedByGuardianId: "guardian-1",
          active: false,
          status: "PENDING",
        }),
      })
    );
  });

  it("CASO 6: audita a criação e notifica os admins", async () => {
    const { requestMedicationAuthorizationAction } = await import("./actions");
    await requestMedicationAuthorizationAction(formData(validFields));

    expect(recordAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ actorUserId: "user-1", action: "CREATE", entity: "MedicationAuthorization", entityId: "auth-1" })
    );
    expect(notifyAdmins).toHaveBeenCalledWith(
      "MEDICATION",
      expect.any(String),
      expect.stringContaining("Paracetamol"),
      { entity: "MedicationAuthorization", entityId: "auth-1" }
    );
  });

  it("CASO 7: exige a permissão authorizeMedication para a criança", async () => {
    requireGuardianChildPermission.mockRejectedValueOnce(new Error("Você não tem permissão para acessar esta criança."));
    const { requestMedicationAuthorizationAction } = await import("./actions");

    await expect(requestMedicationAuthorizationAction(formData(validFields))).rejects.toThrow(
      "Você não tem permissão para acessar esta criança."
    );
    expect(requireGuardianChildPermission).toHaveBeenCalledWith("child-1", "authorizeMedication");
  });
});
