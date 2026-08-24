import bcrypt from "bcryptjs";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * changePasswordAction é compartilhada pelos 3 perfis (/admin/configuracoes, /cuidadora/perfil,
 * /pais/perfil) — testada uma vez aqui, na camada real (incluindo bcrypt de verdade, como
 * verify-credentials.test.ts já faz), cobrindo as regras exigidas pela seção 30 do spec: sucesso,
 * senha atual errada, confirmação diferente e senha vazia/curta.
 */

const auth = vi.fn();
const findUniqueUser = vi.fn();
const updateUser = vi.fn();
const recordAuditLog = vi.fn();

let currentPasswordHash: string;

beforeEach(async () => {
  vi.resetModules();
  vi.doMock("@/auth", () => ({ auth: (...args: unknown[]) => auth(...args) }));
  vi.doMock("@/lib/prisma", () => ({
    prisma: {
      user: {
        findUnique: (...args: unknown[]) => findUniqueUser(...args),
        update: (...args: unknown[]) => updateUser(...args),
      },
    },
  }));
  vi.doMock("@/lib/audit-log", () => ({ recordAuditLog: (...args: unknown[]) => recordAuditLog(...args) }));

  currentPasswordHash = await bcrypt.hash("senhaAtual123", 10);

  auth.mockReset().mockResolvedValue({ user: { id: "user-1" } });
  findUniqueUser.mockReset().mockImplementation(async () => ({ id: "user-1", passwordHash: currentPasswordHash }));
  updateUser.mockReset().mockResolvedValue(undefined);
  recordAuditLog.mockReset().mockResolvedValue(undefined);
});

function formData(fields: Record<string, string>) {
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) fd.set(key, value);
  return fd;
}

describe("changePasswordAction", () => {
  it("altera a senha quando a atual está correta e a nova é válida", async () => {
    const { changePasswordAction } = await import("./account-actions");
    const result = await changePasswordAction(
      undefined,
      formData({ currentPassword: "senhaAtual123", newPassword: "novaSenha123", confirmPassword: "novaSenha123" })
    );

    expect(result).toEqual({ success: true });
    expect(updateUser).toHaveBeenCalledOnce();
    const newHash = (updateUser.mock.calls[0][0] as { data: { passwordHash: string } }).data.passwordHash;
    await expect(bcrypt.compare("novaSenha123", newHash)).resolves.toBe(true);
    expect(recordAuditLog).toHaveBeenCalledWith(expect.objectContaining({ entity: "User", actorUserId: "user-1" }));
  });

  it("recusa quando a senha atual está incorreta", async () => {
    const { changePasswordAction } = await import("./account-actions");
    const result = await changePasswordAction(
      undefined,
      formData({ currentPassword: "senha-errada", newPassword: "novaSenha123", confirmPassword: "novaSenha123" })
    );

    expect(result).toEqual({ error: "Senha atual incorreta." });
    expect(updateUser).not.toHaveBeenCalled();
  });

  it("recusa quando a confirmação não coincide com a nova senha", async () => {
    const { changePasswordAction } = await import("./account-actions");
    const result = await changePasswordAction(
      undefined,
      formData({ currentPassword: "senhaAtual123", newPassword: "novaSenha123", confirmPassword: "outraSenha456" })
    );

    expect(result).toEqual({ error: "A confirmação não coincide com a nova senha." });
    expect(updateUser).not.toHaveBeenCalled();
  });

  it("recusa uma nova senha menor que 8 caracteres", async () => {
    const { changePasswordAction } = await import("./account-actions");
    const result = await changePasswordAction(
      undefined,
      formData({ currentPassword: "senhaAtual123", newPassword: "curta", confirmPassword: "curta" })
    );

    expect(result).toEqual({ error: "A nova senha deve ter pelo menos 8 caracteres." });
    expect(updateUser).not.toHaveBeenCalled();
  });

  it("recusa quando algum campo está vazio", async () => {
    const { changePasswordAction } = await import("./account-actions");
    const result = await changePasswordAction(undefined, formData({ currentPassword: "", newPassword: "", confirmPassword: "" }));

    expect(result).toEqual({ error: "Preencha todos os campos." });
    expect(updateUser).not.toHaveBeenCalled();
  });

  it("recusa quando não há sessão autenticada", async () => {
    auth.mockResolvedValueOnce(null);
    const { changePasswordAction } = await import("./account-actions");
    const result = await changePasswordAction(
      undefined,
      formData({ currentPassword: "senhaAtual123", newPassword: "novaSenha123", confirmPassword: "novaSenha123" })
    );

    expect(result).toEqual({ error: "Não autenticado." });
  });
});
