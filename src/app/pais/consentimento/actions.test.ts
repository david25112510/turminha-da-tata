import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * acceptConsentAction espelha acceptContractAction (src/app/pais/contrato/actions.test.ts) — mesmas
 * regras de segurança e idempotência, aplicadas ao termo de consentimento LGPD por guardian.
 */

const auth = vi.fn();
const findFirstAcceptance = vi.fn();
const updateAcceptance = vi.fn();
const recordAuditLog = vi.fn();
const guardianFindUnique = vi.fn();
const uploadFile = vi.fn();
const deleteStoredObject = vi.fn();

const FAKE_SIGNATURE = `data:image/png;base64,${"A".repeat(300)}`;

beforeEach(() => {
  vi.resetModules();
  vi.doMock("@/auth", () => ({ auth: (...args: unknown[]) => auth(...args) }));
  vi.doMock("next/headers", () => ({ headers: async () => new Headers({ "user-agent": "vitest" }) }));
  vi.doMock("@/lib/prisma", () => ({
    prisma: {
      consentAcceptance: {
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
  uploadFile.mockReset().mockResolvedValue("https://cdn.example.com/consents/guardian-1/acc-1.png");
});

function formData(fields: Record<string, string>) {
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) fd.set(key, value);
  return fd;
}

const PENDING_ACCEPTANCE = {
  id: "acc-1",
  guardianId: "guardian-1",
  versionId: "v-1",
  status: "PENDING",
  version: { id: "v-1", content: "Texto do termo LGPD" },
};

describe("acceptConsentAction", () => {
  it("registra o aceite com assinatura quando o checkbox está marcado e a acceptance pertence ao guardian", async () => {
    findFirstAcceptance.mockResolvedValueOnce(PENDING_ACCEPTANCE);
    const { acceptConsentAction } = await import("./actions");

    await acceptConsentAction(formData({ acceptanceId: "acc-1", agreed: "on", signature: FAKE_SIGNATURE }));

    expect(findFirstAcceptance).toHaveBeenCalledWith({
      where: { id: "acc-1", guardianId: "guardian-1" },
      include: { version: true },
    });
    expect(uploadFile).toHaveBeenCalledWith(expect.stringMatching(/^consents\/guardian-1\/acc-1-[a-f0-9]{64}-.+\.png$/), expect.any(Buffer), "image/png");

    const data = (updateAcceptance.mock.calls[0][0] as { data: Record<string, unknown> }).data;
    expect(data.status).toBe("ACCEPTED");
    expect(data.acceptedByUserId).toBe("guardian-user-1");
    expect(typeof data.documentHash).toBe("string");
    expect((data.documentHash as string).length).toBe(64);

    expect(recordAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "CONSENTIMENTO_LGPD_ACEITO", actorUserId: "guardian-user-1" })
    );
  });

  it("recusa quando o checkbox não foi marcado", async () => {
    const { acceptConsentAction } = await import("./actions");
    await expect(acceptConsentAction(formData({ acceptanceId: "acc-1", signature: FAKE_SIGNATURE }))).rejects.toThrow(
      "É preciso marcar que você leu e concorda com os termos."
    );
    expect(updateAcceptance).not.toHaveBeenCalled();
  });

  it("recusa quando não há assinatura", async () => {
    const { acceptConsentAction } = await import("./actions");
    await expect(acceptConsentAction(formData({ acceptanceId: "acc-1", agreed: "on" }))).rejects.toThrow(
      "Por favor, realize sua assinatura antes de continuar."
    );
    expect(uploadFile).not.toHaveBeenCalled();
  });

  it("nunca aceita uma acceptance de outro guardian, mesmo com ID válido no form", async () => {
    findFirstAcceptance.mockResolvedValueOnce(null);
    const { acceptConsentAction } = await import("./actions");

    await expect(
      acceptConsentAction(formData({ acceptanceId: "acc-de-outro-guardian", agreed: "on", signature: FAKE_SIGNATURE }))
    ).rejects.toThrow("Termo de consentimento não encontrado.");
    expect(updateAcceptance).not.toHaveBeenCalled();
  });

  it("é idempotente: um segundo aceite para uma acceptance já ACCEPTED não faz nada", async () => {
    findFirstAcceptance.mockResolvedValueOnce({ ...PENDING_ACCEPTANCE, status: "ACCEPTED" });
    const { acceptConsentAction } = await import("./actions");

    await acceptConsentAction(formData({ acceptanceId: "acc-1", agreed: "on", signature: FAKE_SIGNATURE }));

    expect(uploadFile).not.toHaveBeenCalled();
    expect(updateAcceptance).not.toHaveBeenCalled();
    expect(recordAuditLog).not.toHaveBeenCalled();
  });
});
