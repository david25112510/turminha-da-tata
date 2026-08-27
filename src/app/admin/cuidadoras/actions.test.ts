import bcrypt from "bcryptjs";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Cobre o CRUD de cuidadoras pedido na seção 30 do spec: admin cria, edita, desativa e reativa uma
 * cuidadora — exercitando as Server Actions reais, com requireAdmin/toggleUserActive/notifyAdmins mockados
 * (essas peças já têm teste próprio em security-rules.test.ts, account-actions.test.ts e afins).
 */

const requireAdmin = vi.fn();
const findUniqueUser = vi.fn();
const findFirstUser = vi.fn();
const createUser = vi.fn();
const updateUser = vi.fn();
const deleteUser = vi.fn();
const recordAuditLog = vi.fn();
const notifyAdmins = vi.fn();
const toggleUserActive = vi.fn();

beforeEach(() => {
  vi.resetModules();
  vi.doMock("next/cache", () => ({ revalidatePath: () => {} }));
  vi.doMock("@/lib/authz", () => ({ requireAdmin: (...args: unknown[]) => requireAdmin(...args) }));
  vi.doMock("@/lib/audit-log", () => ({ recordAuditLog: (...args: unknown[]) => recordAuditLog(...args) }));
  vi.doMock("@/lib/notifications", () => ({ notifyAdmins: (...args: unknown[]) => notifyAdmins(...args) }));
  vi.doMock("@/lib/user-actions", () => ({ toggleUserActive: (...args: unknown[]) => toggleUserActive(...args) }));
  vi.doMock("@/lib/storage", () => ({ uploadFile: vi.fn() }));
  vi.doMock("@/lib/prisma", () => ({
    prisma: {
      user: {
        findUnique: (...args: unknown[]) => findUniqueUser(...args),
        findFirst: (...args: unknown[]) => findFirstUser(...args),
        create: (...args: unknown[]) => createUser(...args),
        update: (...args: unknown[]) => updateUser(...args),
        delete: (...args: unknown[]) => deleteUser(...args),
      },
    },
  }));

  requireAdmin.mockReset().mockResolvedValue({ id: "admin-1" });
  findUniqueUser.mockReset().mockResolvedValue(null);
  findFirstUser.mockReset();
  createUser.mockReset().mockResolvedValue({ id: "caregiver-1", name: "Ana Souza" });
  updateUser.mockReset().mockResolvedValue(undefined);
  deleteUser.mockReset().mockResolvedValue(undefined);
  recordAuditLog.mockReset().mockResolvedValue(undefined);
  notifyAdmins.mockReset().mockResolvedValue(undefined);
  toggleUserActive.mockReset().mockResolvedValue(true);
});

function formData(fields: Record<string, string>) {
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) fd.set(key, value);
  return fd;
}

describe("createCaregiverAction", () => {
  it("cria a cuidadora com role CAREGIVER e senha hasheada, e notifica o admin", async () => {
    const { createCaregiverAction } = await import("./actions");
    const result = await createCaregiverAction(
      undefined,
      formData({ name: "Ana Souza", email: "ana@turminhadatata.com.br", phone: "11999999999", tempPassword: "SenhaInicial123" })
    );

    expect(result).toEqual({ success: true, id: "caregiver-1", name: "Ana Souza" });
    expect(createUser).toHaveBeenCalledOnce();
    const data = (createUser.mock.calls[0][0] as { data: Record<string, unknown> }).data;
    expect(data).toMatchObject({ name: "Ana Souza", email: "ana@turminhadatata.com.br", role: "CAREGIVER" });
    expect(data.passwordHash).not.toBe("SenhaInicial123");
    await expect(bcrypt.compare("SenhaInicial123", data.passwordHash as string)).resolves.toBe(true);

    expect(recordAuditLog).toHaveBeenCalledWith(expect.objectContaining({ entity: "User", action: "CREATE" }));
    expect(notifyAdmins).toHaveBeenCalledWith("CAREGIVER_CREATED", expect.any(String), expect.any(String), expect.any(Object));
  });

  it("recusa quando já existe um usuário com este e-mail", async () => {
    findUniqueUser.mockResolvedValueOnce({ id: "existing-user" });
    const { createCaregiverAction } = await import("./actions");

    const result = await createCaregiverAction(
      undefined,
      formData({ name: "Ana Souza", email: "ana@turminhadatata.com.br", phone: "11999999999", tempPassword: "SenhaInicial123" })
    );
    expect(result).toEqual({ error: "Já existe um usuário com este e-mail." });
    expect(createUser).not.toHaveBeenCalled();
  });

  it("recusa uma senha inicial menor que 8 caracteres", async () => {
    const { createCaregiverAction } = await import("./actions");
    const result = await createCaregiverAction(
      undefined,
      formData({ name: "Ana Souza", email: "ana@turminhadatata.com.br", phone: "11999999999", tempPassword: "curta" })
    );
    expect(result).toEqual({ error: "A senha inicial deve ter pelo menos 8 caracteres." });
    expect(createUser).not.toHaveBeenCalled();
  });

  it("exige requireAdmin — nunca cria cuidadora sem sessão de admin válida", async () => {
    requireAdmin.mockRejectedValueOnce(new Error("Você não tem permissão para realizar esta operação."));
    const { createCaregiverAction } = await import("./actions");

    await expect(
      createCaregiverAction(
        undefined,
        formData({ name: "Ana Souza", email: "ana@turminhadatata.com.br", phone: "11999999999", tempPassword: "SenhaInicial123" })
      )
    ).rejects.toThrow("Você não tem permissão para realizar esta operação.");
    expect(createUser).not.toHaveBeenCalled();
  });
});

describe("updateCaregiverAction", () => {
  it("atualiza os dados pessoais de uma cuidadora existente", async () => {
    findFirstUser.mockResolvedValueOnce({ id: "caregiver-1", role: "CAREGIVER", name: "Ana Souza", phone: "11999999999" });
    const { updateCaregiverAction } = await import("./actions");

    await updateCaregiverAction(formData({ id: "caregiver-1", name: "Ana Souza Lima", phone: "11988888888" }));

    expect(updateUser).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "caregiver-1" },
        data: expect.objectContaining({ name: "Ana Souza Lima", phone: "11988888888" }),
      })
    );
  });

  it("recusa editar um usuário que não é cuidadora", async () => {
    findFirstUser.mockResolvedValueOnce(null); // findFirst com role: "CAREGIVER" não encontrou (ex.: id de outro papel)
    const { updateCaregiverAction } = await import("./actions");

    await expect(updateCaregiverAction(formData({ id: "guardian-1", name: "Outro Nome" }))).rejects.toThrow(
      "Cuidadora não encontrada."
    );
    expect(updateUser).not.toHaveBeenCalled();
  });
});

describe("toggleCaregiverActiveAction", () => {
  it("desativa/reativa delegando para toggleUserActive", async () => {
    findFirstUser.mockResolvedValueOnce({ id: "caregiver-1", role: "CAREGIVER" });
    const { toggleCaregiverActiveAction } = await import("./actions");

    await toggleCaregiverActiveAction(formData({ id: "caregiver-1" }));

    expect(toggleUserActive).toHaveBeenCalledWith("caregiver-1", "admin-1");
  });

  it("recusa alternar o status de um usuário que não é cuidadora", async () => {
    findFirstUser.mockResolvedValueOnce(null);
    const { toggleCaregiverActiveAction } = await import("./actions");

    await expect(toggleCaregiverActiveAction(formData({ id: "guardian-1" }))).rejects.toThrow("Cuidadora não encontrada.");
    expect(toggleUserActive).not.toHaveBeenCalled();
  });
});

describe("deleteCaregiverAction", () => {
  it("recusa excluir um usuário que não é cuidadora", async () => {
    findFirstUser.mockResolvedValueOnce(null);
    const { deleteCaregiverAction } = await import("./actions");

    await expect(deleteCaregiverAction(formData({ id: "guardian-1", confirmName: "Ana Souza" }))).rejects.toThrow(
      "Cuidadora não encontrada."
    );
    expect(deleteUser).not.toHaveBeenCalled();
  });

  it("recusa quando o nome digitado não confere exatamente", async () => {
    findFirstUser.mockResolvedValueOnce({ id: "caregiver-1", role: "CAREGIVER", name: "Ana Souza" });
    const { deleteCaregiverAction } = await import("./actions");

    await expect(deleteCaregiverAction(formData({ id: "caregiver-1", confirmName: "ana souza" }))).rejects.toThrow(
      "O nome digitado não confere. Exclusão cancelada."
    );
    expect(deleteUser).not.toHaveBeenCalled();
  });

  it("CASO 1: audita antes de apagar e remove só a conta — os registros que ela fez continuam no banco (SetNull, ver schema)", async () => {
    findFirstUser.mockResolvedValueOnce({ id: "caregiver-1", role: "CAREGIVER", name: "Ana Souza", email: "ana@turminhadatata.com.br" });
    const callOrder: string[] = [];
    recordAuditLog.mockImplementationOnce(async () => {
      callOrder.push("audit");
    });
    deleteUser.mockImplementationOnce(async () => {
      callOrder.push("delete");
    });

    const { deleteCaregiverAction } = await import("./actions");
    await deleteCaregiverAction(formData({ id: "caregiver-1", confirmName: "Ana Souza" }));

    expect(recordAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ actorUserId: "admin-1", action: "DELETE", entity: "User", entityId: "caregiver-1" })
    );
    expect(deleteUser).toHaveBeenCalledWith({ where: { id: "caregiver-1" } });
    expect(callOrder).toEqual(["audit", "delete"]);
  });
});
