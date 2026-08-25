import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * generateTotpSetupAction/confirmTotpEnrollmentAction/disableTotpAction: gera-se o segredo sem
 * gravar nada (só confirmTotpEnrollmentAction grava, e só depois de validar o código — ativação
 * atômica), e desativar exige reautenticação por senha (mesmo padrão de trocar a própria senha).
 */

const requireAdmin = vi.fn();
const findUniqueUser = vi.fn();
const updateUser = vi.fn();
const recordAuditLog = vi.fn();
const bcryptCompare = vi.fn();
const generateTotpSecret = vi.fn();
const totpUri = vi.fn();
const verifyTotpCode = vi.fn();

beforeEach(() => {
  vi.resetModules();
  vi.doMock("next/cache", () => ({ revalidatePath: () => {} }));
  vi.doMock("@/lib/authz", () => ({ requireAdmin: (...args: unknown[]) => requireAdmin(...args) }));
  vi.doMock("@/lib/audit-log", () => ({ recordAuditLog: (...args: unknown[]) => recordAuditLog(...args) }));
  vi.doMock("@/lib/user-actions", () => ({ toggleUserActive: vi.fn() }));
  vi.doMock("bcryptjs", () => ({ default: { compare: (...args: unknown[]) => bcryptCompare(...args) } }));
  vi.doMock("@/lib/totp", () => ({
    generateTotpSecret: (...args: unknown[]) => generateTotpSecret(...args),
    totpUri: (...args: unknown[]) => totpUri(...args),
    verifyTotpCode: (...args: unknown[]) => verifyTotpCode(...args),
  }));
  vi.doMock("@/lib/prisma", () => ({
    prisma: {
      user: {
        findUnique: (...args: unknown[]) => findUniqueUser(...args),
        update: (...args: unknown[]) => updateUser(...args),
      },
    },
  }));

  requireAdmin.mockReset().mockResolvedValue({ id: "admin-1" });
  findUniqueUser.mockReset();
  updateUser.mockReset().mockResolvedValue(undefined);
  recordAuditLog.mockReset().mockResolvedValue(undefined);
  bcryptCompare.mockReset();
  generateTotpSecret.mockReset();
  totpUri.mockReset();
  verifyTotpCode.mockReset();
});

function formData(fields: Record<string, string>) {
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) fd.set(key, value);
  return fd;
}

describe("generateTotpSetupAction", () => {
  it("CASO 1: gera um segredo e a URI otpauth, sem gravar nada no banco ainda", async () => {
    findUniqueUser.mockResolvedValueOnce({ email: "admin@turminhadatata.com.br" });
    generateTotpSecret.mockReturnValueOnce("SECRETBASE32");
    totpUri.mockReturnValueOnce("otpauth://totp/...");
    const { generateTotpSetupAction } = await import("./actions");

    const result = await generateTotpSetupAction();

    expect(result).toEqual({ secret: "SECRETBASE32", uri: "otpauth://totp/..." });
    expect(updateUser).not.toHaveBeenCalled();
  });

  it("CASO 2: retorna erro se o usuário autenticado não for encontrado", async () => {
    findUniqueUser.mockResolvedValueOnce(null);
    const { generateTotpSetupAction } = await import("./actions");

    const result = await generateTotpSetupAction();

    expect(result).toEqual({ error: "Usuário não encontrado." });
  });
});

describe("confirmTotpEnrollmentAction", () => {
  it("CASO 1: código inválido rejeita e não grava nada", async () => {
    verifyTotpCode.mockReturnValueOnce(false);
    const { confirmTotpEnrollmentAction } = await import("./actions");

    const result = await confirmTotpEnrollmentAction(undefined, formData({ secret: "SECRET", code: "000000" }));

    expect(result).toEqual({ error: "Código inválido. Confira o horário do seu celular e tente novamente." });
    expect(updateUser).not.toHaveBeenCalled();
    expect(recordAuditLog).not.toHaveBeenCalled();
  });

  it("CASO 2: código correto grava totpSecret + totpEnabled atomicamente e audita", async () => {
    verifyTotpCode.mockReturnValueOnce(true);
    const { confirmTotpEnrollmentAction } = await import("./actions");

    const result = await confirmTotpEnrollmentAction(undefined, formData({ secret: "SECRET", code: "123456" }));

    expect(result).toEqual({ success: true });
    expect(updateUser).toHaveBeenCalledWith({
      where: { id: "admin-1" },
      data: { totpSecret: "SECRET", totpEnabled: true },
    });
    expect(recordAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ actorUserId: "admin-1", action: "UPDATE", entity: "User", entityId: "admin-1" })
    );
  });

  it("CASO 3: rejeita quando secret ou código estão vazios, sem sequer validar", async () => {
    const { confirmTotpEnrollmentAction } = await import("./actions");

    const result = await confirmTotpEnrollmentAction(undefined, formData({ secret: "", code: "" }));

    expect(result).toEqual({ error: "Preencha o código de confirmação." });
    expect(verifyTotpCode).not.toHaveBeenCalled();
  });
});

describe("disableTotpAction", () => {
  it("CASO 1: senha atual incorreta rejeita e não desativa", async () => {
    findUniqueUser.mockResolvedValueOnce({ passwordHash: "hash" });
    bcryptCompare.mockResolvedValueOnce(false);
    const { disableTotpAction } = await import("./actions");

    const result = await disableTotpAction(undefined, formData({ currentPassword: "errada" }));

    expect(result).toEqual({ error: "Senha atual incorreta." });
    expect(updateUser).not.toHaveBeenCalled();
  });

  it("CASO 2: senha correta limpa totpSecret + totpEnabled e audita", async () => {
    findUniqueUser.mockResolvedValueOnce({ passwordHash: "hash" });
    bcryptCompare.mockResolvedValueOnce(true);
    const { disableTotpAction } = await import("./actions");

    const result = await disableTotpAction(undefined, formData({ currentPassword: "correta" }));

    expect(result).toEqual({ success: true });
    expect(updateUser).toHaveBeenCalledWith({
      where: { id: "admin-1" },
      data: { totpSecret: null, totpEnabled: false },
    });
    expect(recordAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ actorUserId: "admin-1", action: "UPDATE", entity: "User", entityId: "admin-1" })
    );
  });

  it("CASO 3: rejeita quando a senha atual não é informada", async () => {
    const { disableTotpAction } = await import("./actions");

    const result = await disableTotpAction(undefined, formData({ currentPassword: "" }));

    expect(result).toEqual({ error: "Informe sua senha atual." });
    expect(bcryptCompare).not.toHaveBeenCalled();
  });
});
