import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * acceptContractAction é o único ponto de escrita do aceite — cobre as regras da seção "ACEITE
 * DIGITAL" + "ASSINATURA" do pedido: checkbox obrigatório, assinatura obrigatória, o aceite nunca
 * confia no ID vindo do form (só aceita se a ContractAcceptance realmente pertencer ao guardian
 * autenticado), e é idempotente (duplo clique/duas abas não geram um segundo aceite/assinatura).
 */

const auth = vi.fn();
const findFirstAcceptance = vi.fn();
const updateAcceptance = vi.fn();
const recordAuditLog = vi.fn();
const guardianFindUnique = vi.fn();
const uploadFile = vi.fn();
const deleteStoredObject = vi.fn();

// PNG "de verdade" não importa aqui — uploadFile está mockado, só o tamanho do base64 é validado.
const FAKE_SIGNATURE = `data:image/png;base64,${"A".repeat(300)}`;

beforeEach(() => {
  vi.resetModules();
  vi.doMock("@/auth", () => ({ auth: (...args: unknown[]) => auth(...args) }));
  vi.doMock("next/headers", () => ({ headers: async () => new Headers({ "user-agent": "vitest" }) }));
  vi.doMock("@/lib/prisma", () => ({
    prisma: {
      contractAcceptance: {
        findFirst: (...args: unknown[]) => findFirstAcceptance(...args),
        updateMany: (...args: unknown[]) => updateAcceptance(...args),
      },
      guardian: { findUnique: (...args: unknown[]) => guardianFindUnique(...args) },
    },
  }));
  vi.doMock("@/lib/audit-log", () => ({ recordAuditLog: (...args: unknown[]) => recordAuditLog(...args) }));
  vi.doMock("@/lib/storage", () => ({ uploadFile: (...args: unknown[]) => uploadFile(...args), deleteStoredObject: (...args: unknown[]) => deleteStoredObject(...args) }));

  auth.mockReset().mockResolvedValue({ user: { id: "guardian-user-1", role: "GUARDIAN" } });
  guardianFindUnique.mockReset().mockResolvedValue({ id: "guardian-1", userId: "guardian-user-1", children: [] });
  findFirstAcceptance.mockReset();
  updateAcceptance.mockReset().mockResolvedValue({ count: 1 });
  deleteStoredObject.mockReset().mockResolvedValue(undefined);
  recordAuditLog.mockReset().mockResolvedValue(undefined);
  uploadFile.mockReset().mockResolvedValue("https://cdn.example.com/contracts/child-1/acc-1.png");
});

function formData(fields: Record<string, string>) {
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) fd.set(key, value);
  return fd;
}

const PENDING_ACCEPTANCE = {
  id: "acc-1",
  childId: "child-1",
  guardianId: "guardian-1",
  versionId: "v-1",
  status: "PENDING",
  version: { id: "v-1", content: "Texto do contrato" },
};

describe("acceptContractAction", () => {
  it("registra o aceite com assinatura quando o checkbox está marcado e a acceptance pertence ao guardian", async () => {
    findFirstAcceptance.mockResolvedValueOnce(PENDING_ACCEPTANCE);
    const { acceptContractAction } = await import("./actions");

    await acceptContractAction(formData({ acceptanceId: "acc-1", agreed: "on", signature: FAKE_SIGNATURE }));

    expect(findFirstAcceptance).toHaveBeenCalledWith({
      where: { id: "acc-1", guardianId: "guardian-1" },
      include: { version: true },
    });
    expect(uploadFile).toHaveBeenCalledWith(expect.stringMatching(/^contracts\/child-1\/acc-1-[a-f0-9]{64}-.+\.png$/), expect.any(Buffer), "image/png");
    expect(updateAcceptance).toHaveBeenCalledOnce();

    const data = (updateAcceptance.mock.calls[0][0] as { data: Record<string, unknown> }).data;
    expect(data.status).toBe("ACCEPTED");
    expect(data.acceptedByUserId).toBe("guardian-user-1");
    expect(data.signatureUrl).toBe("https://cdn.example.com/contracts/child-1/acc-1.png");
    expect(data.signedAt).toBeInstanceOf(Date);
    expect(typeof data.documentHash).toBe("string");
    expect((data.documentHash as string).length).toBe(64); // sha256 em hex

    expect(recordAuditLog).toHaveBeenCalledWith(expect.objectContaining({ action: "CONTRATO_ASSINADO", actorUserId: "guardian-user-1" }));
    expect(recordAuditLog).toHaveBeenCalledWith(expect.objectContaining({ action: "CONTRATO_ACEITO", actorUserId: "guardian-user-1" }));
  });

  it("recusa quando o checkbox não foi marcado", async () => {
    const { acceptContractAction } = await import("./actions");
    await expect(acceptContractAction(formData({ acceptanceId: "acc-1", signature: FAKE_SIGNATURE }))).rejects.toThrow(
      "É preciso marcar que você leu e concorda com os termos."
    );
    expect(updateAcceptance).not.toHaveBeenCalled();
  });

  it("recusa quando não há assinatura", async () => {
    const { acceptContractAction } = await import("./actions");
    await expect(acceptContractAction(formData({ acceptanceId: "acc-1", agreed: "on" }))).rejects.toThrow(
      "Por favor, realize sua assinatura antes de continuar."
    );
    expect(uploadFile).not.toHaveBeenCalled();
    expect(updateAcceptance).not.toHaveBeenCalled();
  });

  it("recusa uma assinatura vazia/forjada demais curta para ser um traço real", async () => {
    const { acceptContractAction } = await import("./actions");
    await expect(
      acceptContractAction(formData({ acceptanceId: "acc-1", agreed: "on", signature: "data:image/png;base64,AA==" }))
    ).rejects.toThrow("Por favor, realize sua assinatura antes de continuar.");
    expect(updateAcceptance).not.toHaveBeenCalled();
  });

  it("nunca aceita uma acceptance de outro guardian, mesmo com ID válido no form", async () => {
    // findFirst já filtra por guardianId — uma acceptance de outra família nunca é retornada.
    findFirstAcceptance.mockResolvedValueOnce(null);
    const { acceptContractAction } = await import("./actions");

    await expect(
      acceptContractAction(formData({ acceptanceId: "acc-de-outra-familia", agreed: "on", signature: FAKE_SIGNATURE }))
    ).rejects.toThrow("Contrato não encontrado.");
    expect(updateAcceptance).not.toHaveBeenCalled();
  });

  it("é idempotente: um segundo aceite para uma acceptance já ACCEPTED não faz nada", async () => {
    findFirstAcceptance.mockResolvedValueOnce({ ...PENDING_ACCEPTANCE, status: "ACCEPTED" });
    const { acceptContractAction } = await import("./actions");

    await acceptContractAction(formData({ acceptanceId: "acc-1", agreed: "on", signature: FAKE_SIGNATURE }));

    expect(uploadFile).not.toHaveBeenCalled();
    expect(updateAcceptance).not.toHaveBeenCalled();
    expect(recordAuditLog).not.toHaveBeenCalled();
  });

  it("descarta a assinatura perdedora quando outro aceite vence a concorrência", async () => {
    findFirstAcceptance.mockResolvedValueOnce(PENDING_ACCEPTANCE);
    updateAcceptance.mockResolvedValueOnce({ count: 0 });
    const { acceptContractAction } = await import("./actions");

    await acceptContractAction(formData({ acceptanceId: "acc-1", agreed: "on", signature: FAKE_SIGNATURE }));

    expect(deleteStoredObject).toHaveBeenCalledWith("https://cdn.example.com/contracts/child-1/acc-1.png");
    expect(recordAuditLog).not.toHaveBeenCalled();
  });
});
