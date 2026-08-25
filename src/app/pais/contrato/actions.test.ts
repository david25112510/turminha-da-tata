import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * acceptContractAction é o único ponto de escrita do aceite — cobre exatamente as regras da seção
 * "ACEITE DIGITAL" do pedido: checkbox obrigatório, e o aceite nunca confia no ID vindo do form (só
 * aceita se a ContractAcceptance realmente pertencer ao guardian autenticado).
 */

const auth = vi.fn();
const findFirstAcceptance = vi.fn();
const updateAcceptance = vi.fn();
const recordAuditLog = vi.fn();
const guardianFindUnique = vi.fn();

beforeEach(() => {
  vi.resetModules();
  vi.doMock("@/auth", () => ({ auth: (...args: unknown[]) => auth(...args) }));
  vi.doMock("next/headers", () => ({ headers: async () => new Headers({ "user-agent": "vitest" }) }));
  vi.doMock("@/lib/prisma", () => ({
    prisma: {
      contractAcceptance: {
        findFirst: (...args: unknown[]) => findFirstAcceptance(...args),
        update: (...args: unknown[]) => updateAcceptance(...args),
      },
      guardian: { findUnique: (...args: unknown[]) => guardianFindUnique(...args) },
    },
  }));
  vi.doMock("@/lib/audit-log", () => ({ recordAuditLog: (...args: unknown[]) => recordAuditLog(...args) }));

  auth.mockReset().mockResolvedValue({ user: { id: "guardian-user-1", role: "GUARDIAN" } });
  guardianFindUnique.mockReset().mockResolvedValue({ id: "guardian-1", userId: "guardian-user-1", children: [] });
  findFirstAcceptance.mockReset();
  updateAcceptance.mockReset().mockResolvedValue(undefined);
  recordAuditLog.mockReset().mockResolvedValue(undefined);
});

function formData(fields: Record<string, string>) {
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) fd.set(key, value);
  return fd;
}

describe("acceptContractAction", () => {
  it("registra o aceite quando o checkbox está marcado e a acceptance pertence ao guardian", async () => {
    findFirstAcceptance.mockResolvedValueOnce({ id: "acc-1", childId: "child-1", versionId: "v-1", status: "PENDING" });
    const { acceptContractAction } = await import("./actions");

    await acceptContractAction(formData({ acceptanceId: "acc-1", agreed: "on" }));

    expect(findFirstAcceptance).toHaveBeenCalledWith({ where: { id: "acc-1", guardianId: "guardian-1" } });
    expect(updateAcceptance).toHaveBeenCalledOnce();
    const data = (updateAcceptance.mock.calls[0][0] as { data: { status: string; acceptedByUserId: string } }).data;
    expect(data.status).toBe("ACCEPTED");
    expect(data.acceptedByUserId).toBe("guardian-user-1");
    expect(recordAuditLog).toHaveBeenCalledWith(expect.objectContaining({ action: "CONTRATO_ACEITO", actorUserId: "guardian-user-1" }));
  });

  it("recusa quando o checkbox não foi marcado", async () => {
    const { acceptContractAction } = await import("./actions");
    await expect(acceptContractAction(formData({ acceptanceId: "acc-1" }))).rejects.toThrow(
      "É preciso marcar que você leu e concorda com os termos."
    );
    expect(updateAcceptance).not.toHaveBeenCalled();
  });

  it("nunca aceita uma acceptance de outro guardian, mesmo com ID válido no form", async () => {
    // findFirst já filtra por guardianId — uma acceptance de outra família nunca é retornada.
    findFirstAcceptance.mockResolvedValueOnce(null);
    const { acceptContractAction } = await import("./actions");

    await expect(acceptContractAction(formData({ acceptanceId: "acc-de-outra-familia", agreed: "on" }))).rejects.toThrow(
      "Contrato não encontrado."
    );
    expect(updateAcceptance).not.toHaveBeenCalled();
  });
});
