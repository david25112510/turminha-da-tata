import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * publishNewVersionAction cobre a regra da seção "NOVO CONTRATO": publicar uma versão nova arquiva a
 * atual, incrementa a versão, e gera pendência só para vínculos guardian↔child ativos — nunca
 * sobrescrevendo aceites já registrados de versões anteriores.
 */

const auth = vi.fn();
const findFirstVersion = vi.fn();
const updateVersion = vi.fn();
const createVersion = vi.fn();
const findManyGuardianChild = vi.fn();
const createManyAcceptance = vi.fn();
const recordAuditLog = vi.fn();

beforeEach(() => {
  vi.resetModules();
  vi.doMock("@/auth", () => ({ auth: (...args: unknown[]) => auth(...args) }));
  vi.doMock("@/lib/prisma", () => ({
    prisma: {
      contractVersion: {
        findFirst: (...args: unknown[]) => findFirstVersion(...args),
        update: (...args: unknown[]) => updateVersion(...args),
        create: (...args: unknown[]) => createVersion(...args),
      },
      guardianChild: { findMany: (...args: unknown[]) => findManyGuardianChild(...args) },
      contractAcceptance: { createMany: (...args: unknown[]) => createManyAcceptance(...args) },
    },
  }));
  vi.doMock("@/lib/audit-log", () => ({ recordAuditLog: (...args: unknown[]) => recordAuditLog(...args) }));
  vi.doMock("next/navigation", () => ({ redirect: vi.fn() }));

  auth.mockReset().mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } });
  findFirstVersion.mockReset().mockResolvedValue({ id: "v-1", version: "1.0" });
  updateVersion.mockReset().mockResolvedValue(undefined);
  createVersion.mockReset().mockResolvedValue({ id: "v-2", version: "2.0" });
  findManyGuardianChild.mockReset().mockResolvedValue([
    { childId: "child-1", guardianId: "guardian-1" },
    { childId: "child-2", guardianId: "guardian-2" },
  ]);
  createManyAcceptance.mockReset().mockResolvedValue(undefined);
  recordAuditLog.mockReset().mockResolvedValue(undefined);
});

function formData(fields: Record<string, string>) {
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) fd.set(key, value);
  return fd;
}

describe("publishNewVersionAction", () => {
  it("arquiva a versão atual e publica a nova com o conteúdo enviado", async () => {
    const { publishNewVersionAction } = await import("./actions");
    await publishNewVersionAction(formData({ content: "Texto da nova versão" }));

    expect(updateVersion).toHaveBeenCalledWith({ where: { id: "v-1" }, data: { status: "ARCHIVED" } });
    expect(createVersion).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ version: "2.0", content: "Texto da nova versão", status: "PUBLISHED" }) })
    );
  });

  it("gera pendência só para os vínculos guardian↔child ativos, sem tocar em aceites antigos", async () => {
    const { publishNewVersionAction } = await import("./actions");
    await publishNewVersionAction(formData({ content: "Texto" }));

    expect(createManyAcceptance).toHaveBeenCalledWith({
      data: [
        { childId: "child-1", guardianId: "guardian-1", versionId: "v-2", status: "PENDING" },
        { childId: "child-2", guardianId: "guardian-2", versionId: "v-2", status: "PENDING" },
      ],
      skipDuplicates: true,
    });
    // Nunca chama update/delete em ContractAcceptance — aceites de versões antigas não são tocados.
  });

  it("recusa conteúdo vazio", async () => {
    const { publishNewVersionAction } = await import("./actions");
    await expect(publishNewVersionAction(formData({ content: "   " }))).rejects.toThrow(
      "O texto do contrato não pode ficar vazio."
    );
    expect(createVersion).not.toHaveBeenCalled();
  });
});
