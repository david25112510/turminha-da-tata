import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * acceptPrivacyPolicyAction espelha acceptContractAction (src/app/pais/contrato/actions.test.ts) —
 * mesmas regras de segurança/idempotência e o mesmo par de eventos de auditoria (ASSINADA +
 * ACEITA), já que a Política de Privacidade também exige assinatura manuscrita completa.
 */

const auth = vi.fn();
const findFirstAcceptance = vi.fn();
const updateAcceptance = vi.fn();
const recordAuditLog = vi.fn();
const guardianFindUnique = vi.fn();
const uploadFile = vi.fn();

const FAKE_SIGNATURE = `data:image/png;base64,${"A".repeat(300)}`;

beforeEach(() => {
  vi.resetModules();
  vi.doMock("@/auth", () => ({ auth: (...args: unknown[]) => auth(...args) }));
  vi.doMock("next/headers", () => ({ headers: async () => new Headers({ "user-agent": "vitest" }) }));
  vi.doMock("@/lib/prisma", () => ({
    prisma: {
      privacyPolicyAcceptance: {
        findFirst: (...args: unknown[]) => findFirstAcceptance(...args),
        update: (...args: unknown[]) => updateAcceptance(...args),
      },
      guardian: { findUnique: (...args: unknown[]) => guardianFindUnique(...args) },
    },
  }));
  vi.doMock("@/lib/audit-log", () => ({ recordAuditLog: (...args: unknown[]) => recordAuditLog(...args) }));
  vi.doMock("@/lib/storage", () => ({ uploadFile: (...args: unknown[]) => uploadFile(...args) }));

  auth.mockReset().mockResolvedValue({ user: { id: "guardian-user-1", role: "GUARDIAN" } });
  guardianFindUnique.mockReset().mockResolvedValue({ id: "guardian-1", userId: "guardian-user-1", children: [] });
  findFirstAcceptance.mockReset();
  updateAcceptance.mockReset().mockResolvedValue(undefined);
  recordAuditLog.mockReset().mockResolvedValue(undefined);
  uploadFile.mockReset().mockResolvedValue("https://cdn.example.com/privacy-policy/guardian-1/acc-1.png");
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
  version: { id: "v-1", content: "Texto da política de privacidade" },
};

describe("acceptPrivacyPolicyAction", () => {
  it("registra o aceite com assinatura quando o checkbox está marcado e a acceptance pertence ao guardian", async () => {
    findFirstAcceptance.mockResolvedValueOnce(PENDING_ACCEPTANCE);
    const { acceptPrivacyPolicyAction } = await import("./actions");

    await acceptPrivacyPolicyAction(formData({ acceptanceId: "acc-1", agreed: "on", signature: FAKE_SIGNATURE }));

    expect(findFirstAcceptance).toHaveBeenCalledWith({
      where: { id: "acc-1", guardianId: "guardian-1" },
      include: { version: true },
    });
    expect(uploadFile).toHaveBeenCalledWith("privacy-policy/guardian-1/acc-1.png", expect.any(Buffer), "image/png");

    const data = (updateAcceptance.mock.calls[0][0] as { data: Record<string, unknown> }).data;
    expect(data.status).toBe("ACCEPTED");
    expect(data.acceptedByUserId).toBe("guardian-user-1");
    expect(typeof data.documentHash).toBe("string");
    expect((data.documentHash as string).length).toBe(64);

    expect(recordAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "POLITICA_PRIVACIDADE_ASSINADA", actorUserId: "guardian-user-1" })
    );
    expect(recordAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "POLITICA_PRIVACIDADE_ACEITA", actorUserId: "guardian-user-1" })
    );
  });

  it("recusa quando o checkbox não foi marcado", async () => {
    const { acceptPrivacyPolicyAction } = await import("./actions");
    await expect(acceptPrivacyPolicyAction(formData({ acceptanceId: "acc-1", signature: FAKE_SIGNATURE }))).rejects.toThrow(
      "É preciso marcar que você leu e compreendeu a política."
    );
    expect(updateAcceptance).not.toHaveBeenCalled();
  });

  it("recusa quando não há assinatura", async () => {
    const { acceptPrivacyPolicyAction } = await import("./actions");
    await expect(acceptPrivacyPolicyAction(formData({ acceptanceId: "acc-1", agreed: "on" }))).rejects.toThrow(
      "Por favor, realize sua assinatura antes de continuar."
    );
    expect(uploadFile).not.toHaveBeenCalled();
  });

  it("nunca aceita uma acceptance de outro guardian, mesmo com ID válido no form", async () => {
    findFirstAcceptance.mockResolvedValueOnce(null);
    const { acceptPrivacyPolicyAction } = await import("./actions");

    await expect(
      acceptPrivacyPolicyAction(formData({ acceptanceId: "acc-de-outro-guardian", agreed: "on", signature: FAKE_SIGNATURE }))
    ).rejects.toThrow("Política de Privacidade não encontrada.");
    expect(updateAcceptance).not.toHaveBeenCalled();
  });

  it("é idempotente: um segundo aceite para uma acceptance já ACCEPTED não faz nada", async () => {
    findFirstAcceptance.mockResolvedValueOnce({ ...PENDING_ACCEPTANCE, status: "ACCEPTED" });
    const { acceptPrivacyPolicyAction } = await import("./actions");

    await acceptPrivacyPolicyAction(formData({ acceptanceId: "acc-1", agreed: "on", signature: FAKE_SIGNATURE }));

    expect(uploadFile).not.toHaveBeenCalled();
    expect(updateAcceptance).not.toHaveBeenCalled();
    expect(recordAuditLog).not.toHaveBeenCalled();
  });
});
