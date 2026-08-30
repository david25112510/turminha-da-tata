import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Regressão para um bug crítico encontrado na homologação: loginAction() chamava auth() logo depois de
 * signIn(..., { redirect: false }) na mesma execução do Server Action para descobrir o papel do usuário e
 * montar o redirect — mas essa releitura não enxergava a sessão recém-gravada (o cookie ainda não estava
 * visível para uma releitura dentro do mesmo request), então TODO login válido, de qualquer papel, caía de
 * volta em "/login" em vez de ir para o dashboard. A correção busca o papel diretamente no banco (a
 * credencial já foi validada por signIn não ter lançado erro), sem depender dessa releitura de sessão.
 */

const isRateLimited = vi.fn();
const signIn = vi.fn();
const findUniqueUser = vi.fn();
const redirectSpy = vi.fn();
const bcryptCompare = vi.fn();

class RedirectSignal extends Error {
  constructor(public url: string) {
    super("REDIRECT");
  }
}

// A importação real de "next-auth" puxa next-auth/lib/env.js -> "next/server", que não resolve sob o
// ambiente "node" do Vitest (sem os export conditions do Next.js). Mockado para evitar essa cadeia — só o
// construtor de AuthError importa para o instanceof em actions.ts.
class MockAuthError extends Error {}

beforeEach(() => {
  vi.resetModules();
  vi.doMock("next-auth", () => ({ AuthError: MockAuthError }));
  vi.doMock("next/navigation", () => ({
    redirect: (url: string) => {
      redirectSpy(url);
      throw new RedirectSignal(url);
    },
  }));
  vi.doMock("@/auth", () => ({ signIn: (...args: unknown[]) => signIn(...args) }));
  vi.doMock("@/lib/prisma", () => ({
    prisma: { user: { findUnique: (...args: unknown[]) => findUniqueUser(...args) } },
  }));
  vi.doMock("@/lib/rate-limit", () => ({
    isRateLimited: (...args: unknown[]) => isRateLimited(...args),
  }));
  vi.doMock("@/lib/turnstile", () => ({
    TURNSTILE_FIELD: "cf-turnstile-response",
    verifyTurnstileToken: vi.fn().mockResolvedValue(true),
    turnstileError: () => ({ error: "Falha na verificação." }),
  }));
  vi.doMock("bcryptjs", () => ({
    default: { compare: (...args: unknown[]) => bcryptCompare(...args) },
  }));

  isRateLimited.mockReset().mockResolvedValue(false);
  signIn.mockReset().mockResolvedValue(undefined);
  findUniqueUser.mockReset();
  redirectSpy.mockReset();
  bcryptCompare.mockReset().mockResolvedValue(false);
});

function formData(email: string, password: string, totpCode?: string) {
  const fd = new FormData();
  fd.set("email", email);
  fd.set("password", password);
  if (totpCode !== undefined) fd.set("totpCode", totpCode);
  return fd;
}

describe("loginAction", () => {
  it.each([
    ["ADMIN", "/admin"],
    ["CAREGIVER", "/cuidadora"],
    ["GUARDIAN", "/pais"],
  ])("login válido como %s redireciona para %s", async (role, expectedPath) => {
    // Primeira chamada: pré-checagem de MFA (sem totpEnabled, não entra no fluxo de mfaRequired).
    // Segunda chamada: busca do papel após o signIn para montar o redirect.
    findUniqueUser.mockResolvedValueOnce(undefined).mockResolvedValueOnce({ role });
    const { loginAction } = await import("./actions");

    await expect(loginAction(undefined, formData("a@b.com", "senha-correta"))).rejects.toThrow(RedirectSignal);

    expect(signIn).toHaveBeenCalledWith("credentials", {
      email: "a@b.com",
      password: "senha-correta",
      totpCode: "",
      turnstileToken: "",
      redirect: false,
    });
    expect(redirectSpy).toHaveBeenCalledWith(expectedPath);
  });

  it("retorna mensagem amigável quando as credenciais são inválidas, sem redirecionar", async () => {
    signIn.mockRejectedValueOnce(new MockAuthError("CredentialsSignin"));
    const { loginAction } = await import("./actions");

    const result = await loginAction(undefined, formData("a@b.com", "senha-errada"));

    expect(result).toEqual({ error: "E-mail ou senha inválidos." });
    expect(redirectSpy).not.toHaveBeenCalled();
  });

  it("recusa login quando a taxa de tentativas foi excedida, sem sequer chamar signIn", async () => {
    isRateLimited.mockResolvedValue(true);
    const { loginAction } = await import("./actions");

    const result = await loginAction(undefined, formData("a@b.com", "x"));

    expect(result).toEqual({ error: "Muitas tentativas de login. Tente novamente em alguns minutos." });
    expect(signIn).not.toHaveBeenCalled();
    expect(redirectSpy).not.toHaveBeenCalled();
  });
});

describe("loginAction — pré-checagem de MFA", () => {
  it("CASO 1: admin ativo com MFA habilitado e senha correta pede o código, sem chamar signIn", async () => {
    findUniqueUser.mockResolvedValueOnce({
      role: "ADMIN",
      totpEnabled: true,
      passwordHash: "hash",
      active: true,
    });
    bcryptCompare.mockResolvedValueOnce(true);
    const { loginAction } = await import("./actions");

    const result = await loginAction(undefined, formData("admin@b.com", "senha-correta"));

    expect(result).toEqual({ mfaRequired: true });
    expect(bcryptCompare).toHaveBeenCalledWith("senha-correta", "hash");
    expect(signIn).not.toHaveBeenCalled();
  });

  it("CASO 2: admin com MFA habilitado mas senha errada não pede código, cai para o signIn normal", async () => {
    findUniqueUser
      .mockResolvedValueOnce({ role: "ADMIN", totpEnabled: true, passwordHash: "hash", active: true })
      .mockResolvedValueOnce({ role: "ADMIN" });
    bcryptCompare.mockResolvedValueOnce(false);
    const { loginAction } = await import("./actions");

    await expect(loginAction(undefined, formData("admin@b.com", "senha-errada"))).rejects.toThrow(RedirectSignal);

    expect(signIn).toHaveBeenCalledWith("credentials", {
      email: "admin@b.com",
      password: "senha-errada",
      totpCode: "",
      turnstileToken: "",
      redirect: false,
    });
  });

  it("CASO 3: conta sem MFA habilitado nunca chama bcrypt, segue direto para o signIn", async () => {
    findUniqueUser
      .mockResolvedValueOnce({ role: "CAREGIVER", totpEnabled: false, passwordHash: "hash", active: true })
      .mockResolvedValueOnce({ role: "CAREGIVER" });
    const { loginAction } = await import("./actions");

    await expect(loginAction(undefined, formData("cuidadora@b.com", "senha-correta"))).rejects.toThrow(
      RedirectSignal
    );

    expect(bcryptCompare).not.toHaveBeenCalled();
  });

  it("CASO 4: conta inativa não pede o código de MFA mesmo com senha correta", async () => {
    findUniqueUser
      .mockResolvedValueOnce({ role: "ADMIN", totpEnabled: true, passwordHash: "hash", active: false })
      .mockResolvedValueOnce({ role: "ADMIN" });
    const { loginAction } = await import("./actions");

    await expect(loginAction(undefined, formData("admin@b.com", "senha-correta"))).rejects.toThrow(RedirectSignal);

    expect(bcryptCompare).not.toHaveBeenCalled();
  });

  it("CASO 5: quando o código já foi enviado (segunda etapa), pula a pré-checagem e chama signIn direto", async () => {
    findUniqueUser.mockResolvedValueOnce({ role: "ADMIN" });
    const { loginAction } = await import("./actions");

    await expect(loginAction(undefined, formData("admin@b.com", "senha-correta", "123456"))).rejects.toThrow(
      RedirectSignal
    );

    expect(bcryptCompare).not.toHaveBeenCalled();
    expect(signIn).toHaveBeenCalledWith("credentials", {
      email: "admin@b.com",
      password: "senha-correta",
      totpCode: "123456",
      turnstileToken: "",
      redirect: false,
    });
    // Só uma chamada a findUnique: a busca do papel para o redirect após o signIn.
    expect(findUniqueUser).toHaveBeenCalledTimes(1);
  });
});
