import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * approveSignupRequestAction é onde o User realmente nasce (a solicitação em si nunca cria conta).
 * Para GUARDIAN, também cria Guardian+GuardianChild e os aceites de contrato/consentimento
 * pendentes, mesmo padrão de createGuardianAction — reaproveitado, não reimplementado aqui.
 */

const requireAdmin = vi.fn();
const findUniqueRequest = vi.fn();
const updateRequest = vi.fn();
const createUser = vi.fn();
const createGuardian = vi.fn();
const createGuardianChild = vi.fn();
const recordAuditLog = vi.fn();
const ensureContractAcceptance = vi.fn();
const ensureConsentAcceptance = vi.fn();

beforeEach(() => {
  vi.resetModules();
  vi.doMock("next/cache", () => ({ revalidatePath: () => {} }));
  vi.doMock("@/lib/authz", () => ({ requireAdmin: (...args: unknown[]) => requireAdmin(...args) }));
  vi.doMock("@/lib/audit-log", () => ({ recordAuditLog: (...args: unknown[]) => recordAuditLog(...args) }));
  vi.doMock("@/lib/contract", () => ({ ensureContractAcceptance: (...args: unknown[]) => ensureContractAcceptance(...args) }));
  vi.doMock("@/lib/consent", () => ({ ensureConsentAcceptance: (...args: unknown[]) => ensureConsentAcceptance(...args) }));
  vi.doMock("@/lib/prisma", () => ({
    prisma: {
      signupRequest: {
        findUnique: (...args: unknown[]) => findUniqueRequest(...args),
        update: (...args: unknown[]) => updateRequest(...args),
      },
      user: { create: (...args: unknown[]) => createUser(...args) },
      guardian: { create: (...args: unknown[]) => createGuardian(...args) },
      guardianChild: { create: (...args: unknown[]) => createGuardianChild(...args) },
    },
  }));

  requireAdmin.mockReset().mockResolvedValue({ id: "admin-1" });
  findUniqueRequest.mockReset();
  updateRequest.mockReset().mockResolvedValue(undefined);
  createUser.mockReset().mockResolvedValue({ id: "user-1" });
  createGuardian.mockReset().mockResolvedValue({ id: "guardian-1" });
  createGuardianChild.mockReset().mockResolvedValue(undefined);
  recordAuditLog.mockReset().mockResolvedValue(undefined);
  ensureContractAcceptance.mockReset().mockResolvedValue(undefined);
  ensureConsentAcceptance.mockReset().mockResolvedValue(undefined);
});

function formData(fields: Record<string, string>) {
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) fd.set(key, value);
  return fd;
}

const caregiverRequest = {
  id: "request-1",
  role: "CAREGIVER",
  status: "PENDING",
  name: "Ana Souza",
  email: "ana@example.com",
  passwordHash: "hash",
  phone: "11999999999",
  cpf: null,
  invite: null,
};

const guardianRequest = {
  id: "request-2",
  role: "GUARDIAN",
  status: "PENDING",
  name: "Maria Silva",
  email: "maria@example.com",
  passwordHash: "hash",
  phone: "11988888888",
  cpf: null,
  relationship: "MOTHER",
  invite: { id: "invite-1", childId: "child-1" },
};

describe("approveSignupRequestAction", () => {
  it("recusa quando a solicitação não existe", async () => {
    findUniqueRequest.mockResolvedValueOnce(null);
    const { approveSignupRequestAction } = await import("./actions");
    await expect(approveSignupRequestAction(formData({ id: "request-1" }))).rejects.toThrow("Solicitação não encontrada.");
    expect(createUser).not.toHaveBeenCalled();
  });

  it("recusa quando a solicitação já foi analisada", async () => {
    findUniqueRequest.mockResolvedValueOnce({ ...caregiverRequest, status: "APPROVED" });
    const { approveSignupRequestAction } = await import("./actions");
    await expect(approveSignupRequestAction(formData({ id: "request-1" }))).rejects.toThrow("Esta solicitação já foi analisada.");
    expect(createUser).not.toHaveBeenCalled();
  });

  it("CASO 1: aprova CAREGIVER — cria o User com role CAREGIVER e não mexe em Guardian", async () => {
    findUniqueRequest.mockResolvedValueOnce(caregiverRequest);
    const { approveSignupRequestAction } = await import("./actions");

    await approveSignupRequestAction(formData({ id: "request-1" }));

    expect(createUser).toHaveBeenCalledWith({
      data: expect.objectContaining({ name: "Ana Souza", email: "ana@example.com", role: "CAREGIVER", passwordHash: "hash" }),
    });
    expect(createGuardian).not.toHaveBeenCalled();
    expect(updateRequest).toHaveBeenCalledWith({
      where: { id: "request-1" },
      data: expect.objectContaining({ status: "APPROVED", reviewedByUserId: "admin-1" }),
    });
    expect(recordAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ actorUserId: "admin-1", action: "APPROVE", entity: "SignupRequest", entityId: "request-1" })
    );
  });

  it("CASO 2: aprova GUARDIAN — cria User+Guardian+GuardianChild e os aceites pendentes", async () => {
    findUniqueRequest.mockResolvedValueOnce(guardianRequest);
    const { approveSignupRequestAction } = await import("./actions");

    await approveSignupRequestAction(formData({ id: "request-2" }));

    expect(createUser).toHaveBeenCalledWith({ data: expect.objectContaining({ role: "GUARDIAN", email: "maria@example.com" }) });
    expect(createGuardian).toHaveBeenCalledWith({ data: expect.objectContaining({ userId: "user-1", name: "Maria Silva" }) });
    expect(createGuardianChild).toHaveBeenCalledWith({
      data: expect.objectContaining({ guardianId: "guardian-1", childId: "child-1", relationship: "MOTHER" }),
    });
    expect(ensureContractAcceptance).toHaveBeenCalledWith({ childId: "child-1", guardianId: "guardian-1", actorUserId: "admin-1" });
    expect(ensureConsentAcceptance).toHaveBeenCalledWith({ guardianId: "guardian-1", actorUserId: "admin-1" });
  });

  it("recusa aprovar GUARDIAN sem convite associado (dado inconsistente)", async () => {
    findUniqueRequest.mockResolvedValueOnce({ ...guardianRequest, invite: null });
    const { approveSignupRequestAction } = await import("./actions");

    await expect(approveSignupRequestAction(formData({ id: "request-2" }))).rejects.toThrow(
      "Convite associado a esta solicitação não foi encontrado."
    );
    expect(createUser).not.toHaveBeenCalled();
  });
});

describe("rejectSignupRequestAction", () => {
  it("exige o motivo da recusa", async () => {
    const { rejectSignupRequestAction } = await import("./actions");
    await expect(rejectSignupRequestAction(formData({ id: "request-1", reason: "" }))).rejects.toThrow(
      "Informe o motivo da recusa."
    );
    expect(findUniqueRequest).not.toHaveBeenCalled();
  });

  it("CASO 1: recusa a solicitação e grava o motivo, sem criar nada", async () => {
    findUniqueRequest.mockResolvedValueOnce(caregiverRequest);
    const { rejectSignupRequestAction } = await import("./actions");

    await rejectSignupRequestAction(formData({ id: "request-1", reason: "Não reconhecido pela escola" }));

    expect(updateRequest).toHaveBeenCalledWith({
      where: { id: "request-1" },
      data: expect.objectContaining({ status: "REJECTED", reviewNotes: "Não reconhecido pela escola" }),
    });
    expect(createUser).not.toHaveBeenCalled();
    expect(recordAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ actorUserId: "admin-1", action: "REJECT", entity: "SignupRequest", entityId: "request-1" })
    );
  });
});
