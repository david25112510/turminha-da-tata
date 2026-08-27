import bcrypt from "bcryptjs";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * requestSignupAction nunca cria User — só registra a intenção (SignupRequest PENDING). Cobre as
 * validações de formulário, o rate limit por e-mail (mesmo padrão do login) e o consumo do código
 * de convite para o papel GUARDIAN (a única forma de vincular a solicitação a uma criança).
 */

const isRateLimited = vi.fn();
const recordFailedAttempt = vi.fn();
const findUniqueUser = vi.fn();
const findFirstRequest = vi.fn();
const createRequest = vi.fn();
const consumeGuardianInvite = vi.fn();
const notifyAdmins = vi.fn();

beforeEach(() => {
  vi.resetModules();
  vi.doMock("@/lib/rate-limit", () => ({
    isRateLimited: (...args: unknown[]) => isRateLimited(...args),
    recordFailedAttempt: (...args: unknown[]) => recordFailedAttempt(...args),
  }));
  vi.doMock("@/lib/guardian-invite", () => ({ consumeGuardianInvite: (...args: unknown[]) => consumeGuardianInvite(...args) }));
  vi.doMock("@/lib/notifications", () => ({ notifyAdmins: (...args: unknown[]) => notifyAdmins(...args) }));
  vi.doMock("@/lib/prisma", () => ({
    prisma: {
      user: { findUnique: (...args: unknown[]) => findUniqueUser(...args) },
      signupRequest: {
        findFirst: (...args: unknown[]) => findFirstRequest(...args),
        create: (...args: unknown[]) => createRequest(...args),
      },
    },
  }));

  isRateLimited.mockReset().mockResolvedValue(false);
  recordFailedAttempt.mockReset().mockResolvedValue(undefined);
  findUniqueUser.mockReset().mockResolvedValue(null);
  findFirstRequest.mockReset().mockResolvedValue(null);
  createRequest.mockReset().mockResolvedValue({ id: "request-1" });
  consumeGuardianInvite.mockReset().mockResolvedValue({ id: "invite-1", childId: "child-1" });
  notifyAdmins.mockReset().mockResolvedValue(undefined);
});

function formData(fields: Record<string, string>) {
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) fd.set(key, value);
  return fd;
}

const caregiverFields = {
  role: "CAREGIVER",
  name: "Ana Souza",
  email: "ana@example.com",
  phone: "11999999999",
  password: "SenhaForte123",
  confirmPassword: "SenhaForte123",
};

const guardianFields = {
  role: "GUARDIAN",
  name: "Maria Silva",
  email: "maria@example.com",
  phone: "11988888888",
  password: "SenhaForte123",
  confirmPassword: "SenhaForte123",
  inviteCode: "A1B2C3D4",
  relationship: "MOTHER",
};

describe("requestSignupAction", () => {
  it("CASO 1: recusa um papel inválido", async () => {
    const { requestSignupAction } = await import("./actions");
    const result = await requestSignupAction(undefined, formData({ ...caregiverFields, role: "ADMIN" }));
    expect(result).toEqual({ error: "Selecione se você é cuidadora ou responsável." });
    expect(createRequest).not.toHaveBeenCalled();
  });

  it("CASO 2: recusa e-mail em formato inválido", async () => {
    const { requestSignupAction } = await import("./actions");
    const result = await requestSignupAction(undefined, formData({ ...caregiverFields, email: "não-é-email" }));
    expect(result).toEqual({ error: "E-mail inválido." });
  });

  it("CASO 3: recusa senha curta", async () => {
    const { requestSignupAction } = await import("./actions");
    const result = await requestSignupAction(undefined, formData({ ...caregiverFields, password: "curta", confirmPassword: "curta" }));
    expect(result).toEqual({ error: "A senha deve ter pelo menos 8 caracteres." });
  });

  it("CASO 4: recusa quando as senhas não conferem", async () => {
    const { requestSignupAction } = await import("./actions");
    const result = await requestSignupAction(undefined, formData({ ...caregiverFields, confirmPassword: "Outra12345" }));
    expect(result).toEqual({ error: "As senhas não conferem." });
  });

  it("CASO 5: GUARDIAN sem código de convite é recusado antes de tocar o banco", async () => {
    const { requestSignupAction } = await import("./actions");
    const result = await requestSignupAction(undefined, formData({ ...guardianFields, inviteCode: "" }));
    expect(result).toEqual({ error: "Informe o código de convite fornecido pela escola." });
    expect(consumeGuardianInvite).not.toHaveBeenCalled();
  });

  it("CASO 6: GUARDIAN sem parentesco selecionado é recusado", async () => {
    const { requestSignupAction } = await import("./actions");
    const result = await requestSignupAction(undefined, formData({ ...guardianFields, relationship: "" }));
    expect(result).toEqual({ error: "Selecione seu parentesco com a criança." });
  });

  it("CASO 7: respeita o rate limit por e-mail", async () => {
    isRateLimited.mockResolvedValueOnce(true);
    const { requestSignupAction } = await import("./actions");
    const result = await requestSignupAction(undefined, formData(caregiverFields));
    expect(result).toEqual({ error: "Muitas tentativas. Tente novamente em alguns minutos." });
    expect(createRequest).not.toHaveBeenCalled();
  });

  it("CASO 8: recusa quando já existe uma conta com este e-mail (e registra a tentativa)", async () => {
    findUniqueUser.mockResolvedValueOnce({ id: "user-1" });
    const { requestSignupAction } = await import("./actions");
    const result = await requestSignupAction(undefined, formData(caregiverFields));
    expect(result).toEqual({ error: "Já existe uma conta com este e-mail." });
    expect(recordFailedAttempt).toHaveBeenCalledWith("signup:ana@example.com");
    expect(createRequest).not.toHaveBeenCalled();
  });

  it("CASO 9: recusa quando já existe uma solicitação pendente com este e-mail", async () => {
    findFirstRequest.mockResolvedValueOnce({ id: "request-existing" });
    const { requestSignupAction } = await import("./actions");
    const result = await requestSignupAction(undefined, formData(caregiverFields));
    expect(result).toEqual({ error: "Já existe uma solicitação pendente com este e-mail. Aguarde a análise da escola." });
    expect(createRequest).not.toHaveBeenCalled();
  });

  it("CASO 10: recusa GUARDIAN com código de convite inválido/expirado", async () => {
    consumeGuardianInvite.mockResolvedValueOnce(null);
    const { requestSignupAction } = await import("./actions");
    const result = await requestSignupAction(undefined, formData(guardianFields));
    expect(result).toEqual({ error: "Código de convite inválido, expirado ou já utilizado." });
    expect(createRequest).not.toHaveBeenCalled();
  });

  it("CASO 11: cria a solicitação de CAREGIVER com a senha hasheada e notifica os admins", async () => {
    const { requestSignupAction } = await import("./actions");
    const result = await requestSignupAction(undefined, formData(caregiverFields));

    expect(result).toEqual({ success: true });
    expect(createRequest).toHaveBeenCalledOnce();
    const data = (createRequest.mock.calls[0][0] as { data: Record<string, unknown> }).data;
    expect(data).toMatchObject({ role: "CAREGIVER", name: "Ana Souza", email: "ana@example.com", inviteId: undefined });
    expect(data.passwordHash).not.toBe("SenhaForte123");
    await expect(bcrypt.compare("SenhaForte123", data.passwordHash as string)).resolves.toBe(true);
    expect(notifyAdmins).toHaveBeenCalledWith("SIGNUP_REQUEST", expect.any(String), expect.stringContaining("cuidadora"), {
      entity: "SignupRequest",
      entityId: "request-1",
    });
  });

  it("CASO 12: cria a solicitação de GUARDIAN vinculada ao convite consumido", async () => {
    const { requestSignupAction } = await import("./actions");
    const result = await requestSignupAction(undefined, formData(guardianFields));

    expect(result).toEqual({ success: true });
    const data = (createRequest.mock.calls[0][0] as { data: Record<string, unknown> }).data;
    expect(data).toMatchObject({ role: "GUARDIAN", inviteId: "invite-1", relationship: "MOTHER" });
    expect(notifyAdmins).toHaveBeenCalledWith("SIGNUP_REQUEST", expect.any(String), expect.stringContaining("responsável"), expect.any(Object));
  });

  it("CASO 13: normaliza o e-mail para minúsculas antes de checar duplicidade", async () => {
    const { requestSignupAction } = await import("./actions");
    await requestSignupAction(undefined, formData({ ...caregiverFields, email: "ANA@EXAMPLE.COM" }));

    expect(findUniqueUser).toHaveBeenCalledWith({ where: { email: "ana@example.com" } });
  });
});
