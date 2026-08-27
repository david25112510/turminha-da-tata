import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * updateChildAction: mesmas validações de createChildAction para os campos em comum, mais a regra
 * nova de inactivatedAt acompanhando a transição de status (base para a política de retenção de
 * dados — ver docs/lgpd.md). requireAdmin/recordAuditLog mockados (cobertos em security-rules.test.ts
 * e nos próprios testes de audit-log).
 */

const requireAdmin = vi.fn();
const findUniqueChild = vi.fn();
const updateChild = vi.fn();
const deleteChild = vi.fn();
const recordAuditLog = vi.fn();
const redirect = vi.fn();
const createGuardianInvite = vi.fn();
const isRateLimited = vi.fn();
const recordFailedAttempt = vi.fn();

beforeEach(() => {
  vi.resetModules();
  vi.doMock("next/cache", () => ({ revalidatePath: () => {} }));
  vi.doMock("next/navigation", () => ({ redirect: (...args: unknown[]) => redirect(...args) }));
  vi.doMock("@/lib/authz", () => ({ requireAdmin: (...args: unknown[]) => requireAdmin(...args) }));
  vi.doMock("@/lib/audit-log", () => ({ recordAuditLog: (...args: unknown[]) => recordAuditLog(...args) }));
  vi.doMock("@/lib/storage", () => ({ uploadFile: vi.fn() }));
  vi.doMock("@/lib/guardian-invite", () => ({ createGuardianInvite: (...args: unknown[]) => createGuardianInvite(...args) }));
  vi.doMock("@/lib/rate-limit", () => ({
    isRateLimited: (...args: unknown[]) => isRateLimited(...args),
    recordFailedAttempt: (...args: unknown[]) => recordFailedAttempt(...args),
  }));
  vi.doMock("@/lib/prisma", () => ({
    prisma: {
      child: {
        findUnique: (...args: unknown[]) => findUniqueChild(...args),
        update: (...args: unknown[]) => updateChild(...args),
        delete: (...args: unknown[]) => deleteChild(...args),
      },
    },
  }));

  requireAdmin.mockReset().mockResolvedValue({ id: "admin-1" });
  findUniqueChild.mockReset();
  updateChild.mockReset().mockResolvedValue(undefined);
  deleteChild.mockReset().mockResolvedValue(undefined);
  recordAuditLog.mockReset().mockResolvedValue(undefined);
  redirect.mockReset();
  createGuardianInvite.mockReset().mockResolvedValue({ id: "invite-1", code: "A1B2C3D4" });
  isRateLimited.mockReset().mockResolvedValue(false);
  recordFailedAttempt.mockReset().mockResolvedValue(undefined);
});

const baseChild = {
  id: "child-1",
  preferredName: "Maria",
  generalNotes: null,
  status: "ACTIVE" as const,
  inactivatedAt: null,
  contractedEntryTime: "07:30",
  contractedExitTime: "17:30",
  contractedDays: ["MON", "TUE"],
  toleranceMinutes: 15,
  monthlyFee: { toString: () => "900" },
  overtimeHourRate: { toString: () => "15" },
  dueDay: 5,
  imageAuthInternal: false,
  imageAuthGuardianShare: false,
  imageAuthInstitutional: false,
  imageAuthSocialMedia: false,
  imageAuthAdvertising: false,
};

function formData(fields: Record<string, string>) {
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) fd.set(key, value);
  return fd;
}

const validFields = {
  id: "child-1",
  preferredName: "Maria",
  status: "ACTIVE",
  contractedEntryTime: "07:30",
  contractedExitTime: "17:30",
  toleranceMinutes: "15",
  monthlyFee: "900",
  overtimeHourRate: "15",
  dueDay: "5",
};

describe("updateChildAction", () => {
  it("recusa quando a criança não existe", async () => {
    findUniqueChild.mockResolvedValueOnce(null);
    const { updateChildAction } = await import("./actions");

    await expect(updateChildAction(formData(validFields))).rejects.toThrow("Criança não encontrada.");
    expect(updateChild).not.toHaveBeenCalled();
  });

  it.each([
    ["toleranceMinutes", "-1", "Tolerância inválida."],
    ["monthlyFee", "abc", "Mensalidade inválida."],
    ["overtimeHourRate", "-5", "Valor da hora excedente inválido."],
    ["dueDay", "32", "Dia de vencimento inválido."],
  ])("recusa %s inválido", async (field, value, message) => {
    findUniqueChild.mockResolvedValueOnce(baseChild);
    const { updateChildAction } = await import("./actions");

    await expect(updateChildAction(formData({ ...validFields, [field]: value }))).rejects.toThrow(message);
    expect(updateChild).not.toHaveBeenCalled();
  });

  it("CASO 1: atualiza os campos operacionais e grava oldData/newData no AuditLog", async () => {
    findUniqueChild.mockResolvedValueOnce(baseChild);
    const { updateChildAction } = await import("./actions");

    await updateChildAction(formData({ ...validFields, preferredName: "Maria Eduarda", day_MON: "on" }));

    expect(updateChild).toHaveBeenCalledOnce();
    const data = (updateChild.mock.calls[0][0] as { data: Record<string, unknown> }).data;
    expect(data.preferredName).toBe("Maria Eduarda");
    expect(data.contractedDays).toEqual(["MON"]);

    expect(recordAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "UPDATE",
        entity: "Child",
        entityId: "child-1",
        oldData: expect.objectContaining({ preferredName: "Maria", status: "ACTIVE" }),
        newData: expect.objectContaining({ preferredName: "Maria Eduarda", status: "ACTIVE" }),
      })
    );
    expect(redirect).toHaveBeenCalledWith("/admin/criancas/child-1");
  });

  it("CASO 2: transição ACTIVE → INACTIVE define inactivatedAt com a data atual", async () => {
    findUniqueChild.mockResolvedValueOnce(baseChild); // status ACTIVE, inactivatedAt null
    const { updateChildAction } = await import("./actions");

    await updateChildAction(formData({ ...validFields, status: "INACTIVE" }));

    const data = (updateChild.mock.calls[0][0] as { data: { inactivatedAt: Date | null } }).data;
    expect(data.inactivatedAt).toBeInstanceOf(Date);
  });

  it("CASO 3: transição INACTIVE → ACTIVE (reativação) limpa inactivatedAt", async () => {
    findUniqueChild.mockResolvedValueOnce({ ...baseChild, status: "INACTIVE", inactivatedAt: new Date(2026, 0, 1) });
    const { updateChildAction } = await import("./actions");

    await updateChildAction(formData({ ...validFields, status: "ACTIVE" }));

    const data = (updateChild.mock.calls[0][0] as { data: { inactivatedAt: Date | null } }).data;
    expect(data.inactivatedAt).toBeNull();
  });

  it("CASO 4: permanecer INACTIVE em duas edições seguidas preserva a data original de inativação (não fica reescrevendo)", async () => {
    const originalInactivatedAt = new Date(2026, 0, 1);
    findUniqueChild.mockResolvedValueOnce({ ...baseChild, status: "INACTIVE", inactivatedAt: originalInactivatedAt });
    const { updateChildAction } = await import("./actions");

    await updateChildAction(formData({ ...validFields, status: "INACTIVE" }));

    const data = (updateChild.mock.calls[0][0] as { data: { inactivatedAt: Date | null } }).data;
    expect(data.inactivatedAt).toBe(originalInactivatedAt);
  });

  it("CASO 5: permanecer ACTIVE em duas edições seguidas mantém inactivatedAt null", async () => {
    findUniqueChild.mockResolvedValueOnce(baseChild);
    const { updateChildAction } = await import("./actions");

    await updateChildAction(formData({ ...validFields, status: "ACTIVE" }));

    const data = (updateChild.mock.calls[0][0] as { data: { inactivatedAt: Date | null } }).data;
    expect(data.inactivatedAt).toBeNull();
  });
});

describe("deleteChildAction", () => {
  const childWithHistory = { id: "child-1", fullName: "Maria Eduarda Silva", preferredName: "Maria", birthDate: new Date(2020, 0, 1), status: "ACTIVE", monthlyFee: { toString: () => "900" } };

  it("recusa quando a criança não existe", async () => {
    findUniqueChild.mockResolvedValueOnce(null);
    const { deleteChildAction } = await import("./actions");

    await expect(deleteChildAction(formData({ id: "child-1", confirmName: "Maria Eduarda Silva" }))).rejects.toThrow(
      "Criança não encontrada."
    );
    expect(deleteChild).not.toHaveBeenCalled();
  });

  it("recusa quando o nome digitado não confere exatamente", async () => {
    findUniqueChild.mockResolvedValueOnce(childWithHistory);
    const { deleteChildAction } = await import("./actions");

    await expect(deleteChildAction(formData({ id: "child-1", confirmName: "Maria" }))).rejects.toThrow(
      "O nome digitado não confere. Exclusão cancelada."
    );
    expect(deleteChild).not.toHaveBeenCalled();
  });

  it("CASO 1: audita antes de apagar (nunca silenciosamente) e depois exclui — cascata em prisma/schema.prisma cuida do resto", async () => {
    findUniqueChild.mockResolvedValueOnce(childWithHistory);
    const callOrder: string[] = [];
    recordAuditLog.mockImplementationOnce(async () => {
      callOrder.push("audit");
    });
    deleteChild.mockImplementationOnce(async () => {
      callOrder.push("delete");
    });

    const { deleteChildAction } = await import("./actions");
    await deleteChildAction(formData({ id: "child-1", confirmName: "Maria Eduarda Silva" }));

    expect(recordAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ actorUserId: "admin-1", action: "DELETE", entity: "Child", entityId: "child-1" })
    );
    expect(deleteChild).toHaveBeenCalledWith({ where: { id: "child-1" } });
    expect(callOrder).toEqual(["audit", "delete"]);
    expect(redirect).toHaveBeenCalledWith("/admin/criancas");
  });
});

describe("generateGuardianInviteAction", () => {
  it("recusa quando a criança não existe", async () => {
    findUniqueChild.mockResolvedValueOnce(null);
    const { generateGuardianInviteAction } = await import("./actions");

    const result = await generateGuardianInviteAction(undefined, formData({ childId: "child-1" }));

    expect(result).toEqual({ error: "Criança não encontrada." });
    expect(createGuardianInvite).not.toHaveBeenCalled();
  });

  it("CASO 1: gera o convite e devolve o código bruto (só existe nesta resposta)", async () => {
    findUniqueChild.mockResolvedValueOnce({ id: "child-1", fullName: "Maria" });
    const { generateGuardianInviteAction } = await import("./actions");

    const result = await generateGuardianInviteAction(undefined, formData({ childId: "child-1" }));

    expect(result).toEqual({ code: "A1B2C3D4" });
    expect(createGuardianInvite).toHaveBeenCalledWith("child-1", "admin-1");
    expect(recordAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ actorUserId: "admin-1", action: "CREATE", entity: "GuardianInvite", entityId: "invite-1" })
    );
    expect(recordFailedAttempt).toHaveBeenCalledWith("invite:admin-1");
  });

  it("CASO 2: respeita o rate limit por admin, sem sequer consultar a criança", async () => {
    isRateLimited.mockResolvedValueOnce(true);
    const { generateGuardianInviteAction } = await import("./actions");

    const result = await generateGuardianInviteAction(undefined, formData({ childId: "child-1" }));

    expect(result).toEqual({ error: "Muitos convites gerados em pouco tempo. Tente novamente em alguns minutos." });
    expect(findUniqueChild).not.toHaveBeenCalled();
    expect(createGuardianInvite).not.toHaveBeenCalled();
  });
});
