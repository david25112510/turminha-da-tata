import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * deleteGuardianAction: exclusão permanente do responsável e, se existir, da conta de acesso ao
 * portal vinculada — numa transação (nenhum dos dois sobrevive sozinho a uma falha no meio).
 * Vínculos/cadastros dele (GuardianChild, pessoas autorizadas, aceites) somem em cascata; dados da
 * CRIANÇA (presença, autorização de medicamento) só perdem a referência — cobertos no schema, não
 * duplicados aqui.
 */

const requireAdmin = vi.fn();
const findUniqueGuardian = vi.fn();
const deleteGuardian = vi.fn();
const deleteUser = vi.fn();
const recordAuditLog = vi.fn();
const transaction = vi.fn();

beforeEach(() => {
  vi.resetModules();
  vi.doMock("next/cache", () => ({ revalidatePath: () => {} }));
  vi.doMock("next/navigation", () => ({ redirect: vi.fn() }));
  vi.doMock("@/lib/authz", () => ({ requireAdmin: (...args: unknown[]) => requireAdmin(...args) }));
  vi.doMock("@/lib/audit-log", () => ({ recordAuditLog: (...args: unknown[]) => recordAuditLog(...args) }));
  vi.doMock("@/lib/contract", () => ({ ensureContractAcceptance: vi.fn() }));
  vi.doMock("@/lib/consent", () => ({ ensureConsentAcceptance: vi.fn() }));
  vi.doMock("@/lib/privacy-policy", () => ({ ensurePrivacyPolicyAcceptance: vi.fn() }));
  vi.doMock("bcryptjs", () => ({ default: { hash: vi.fn() } }));
  vi.doMock("@/lib/prisma", () => ({
    prisma: {
      guardian: { findUnique: (...args: unknown[]) => findUniqueGuardian(...args) },
      $transaction: (...args: unknown[]) => transaction(...args),
    },
  }));

  requireAdmin.mockReset().mockResolvedValue({ id: "admin-1" });
  findUniqueGuardian.mockReset();
  deleteGuardian.mockReset().mockResolvedValue(undefined);
  deleteUser.mockReset().mockResolvedValue(undefined);
  recordAuditLog.mockReset().mockResolvedValue(undefined);
  transaction.mockReset().mockImplementation(async (callback: (tx: unknown) => unknown) =>
    callback({
      guardian: { delete: deleteGuardian },
      user: { delete: deleteUser },
    })
  );
});

function formData(fields: Record<string, string>) {
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) fd.set(key, value);
  return fd;
}

describe("deleteGuardianAction", () => {
  it("recusa quando o responsável não existe", async () => {
    findUniqueGuardian.mockResolvedValueOnce(null);
    const { deleteGuardianAction } = await import("./actions");

    await expect(deleteGuardianAction(formData({ id: "guardian-1", confirmName: "Maria" }))).rejects.toThrow(
      "Responsável não encontrado."
    );
    expect(transaction).not.toHaveBeenCalled();
  });

  it("recusa quando o nome digitado não confere exatamente", async () => {
    findUniqueGuardian.mockResolvedValueOnce({ id: "guardian-1", name: "Maria Silva", userId: null });
    const { deleteGuardianAction } = await import("./actions");

    await expect(deleteGuardianAction(formData({ id: "guardian-1", confirmName: "Maria" }))).rejects.toThrow(
      "O nome digitado não confere. Exclusão cancelada."
    );
    expect(transaction).not.toHaveBeenCalled();
  });

  it("CASO 1: exclui só o Guardian quando ele não tem conta de acesso ao portal", async () => {
    findUniqueGuardian.mockResolvedValueOnce({ id: "guardian-1", name: "Maria Silva", userId: null, cpf: "1", phone: "1", email: null });
    const { deleteGuardianAction } = await import("./actions");

    await deleteGuardianAction(formData({ id: "guardian-1", confirmName: "Maria Silva" }));

    expect(deleteGuardian).toHaveBeenCalledWith({ where: { id: "guardian-1" } });
    expect(deleteUser).not.toHaveBeenCalled();
  });

  it("CASO 2: exclui o Guardian e a conta de acesso vinculada, na mesma transação", async () => {
    findUniqueGuardian.mockResolvedValueOnce({
      id: "guardian-1",
      name: "Maria Silva",
      userId: "user-1",
      cpf: "1",
      phone: "1",
      email: "maria@example.com",
    });
    const { deleteGuardianAction } = await import("./actions");

    await deleteGuardianAction(formData({ id: "guardian-1", confirmName: "Maria Silva" }));

    expect(deleteGuardian).toHaveBeenCalledWith({ where: { id: "guardian-1" } });
    expect(deleteUser).toHaveBeenCalledWith({ where: { id: "user-1" } });
  });

  it("CASO 3: audita antes de excluir, com o snapshot do que existia", async () => {
    findUniqueGuardian.mockResolvedValueOnce({
      id: "guardian-1",
      name: "Maria Silva",
      userId: "user-1",
      cpf: "12345678900",
      phone: "11999999999",
      email: "maria@example.com",
    });
    const { deleteGuardianAction } = await import("./actions");

    await deleteGuardianAction(formData({ id: "guardian-1", confirmName: "Maria Silva" }));

    expect(recordAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: "admin-1",
        action: "DELETE",
        entity: "Guardian",
        entityId: "guardian-1",
        oldData: expect.objectContaining({ name: "Maria Silva", hadPortalAccess: true }),
      })
    );
  });
});
