import { beforeEach, describe, expect, it, vi } from "vitest";

const findUniqueUser = vi.fn();
const verifyTotpCode = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: { user: { findUnique: (...args: unknown[]) => findUniqueUser(...args) } },
}));
vi.mock("@/lib/totp", () => ({
  verifyTotpCode: (...args: unknown[]) => verifyTotpCode(...args),
}));

beforeEach(() => {
  findUniqueUser.mockReset();
  verifyTotpCode.mockReset();
});

describe("checkMfaRequirement", () => {
  it("CASO 1: usuário não-admin sempre passa, sem sequer consultar o banco", async () => {
    const { checkMfaRequirement } = await import("./mfa");

    const result = await checkMfaRequirement("user-1", "CAREGIVER", undefined);

    expect(result).toBe(true);
    expect(findUniqueUser).not.toHaveBeenCalled();
  });

  it("CASO 2: admin sem MFA habilitado passa mesmo sem código", async () => {
    findUniqueUser.mockResolvedValueOnce({ totpSecret: null, totpEnabled: false });
    const { checkMfaRequirement } = await import("./mfa");

    const result = await checkMfaRequirement("admin-1", "ADMIN", undefined);

    expect(result).toBe(true);
    expect(verifyTotpCode).not.toHaveBeenCalled();
  });

  it("CASO 3: admin com MFA habilitado e sem código é rejeitado", async () => {
    findUniqueUser.mockResolvedValueOnce({ totpSecret: "SECRET", totpEnabled: true });
    const { checkMfaRequirement } = await import("./mfa");

    const result = await checkMfaRequirement("admin-1", "ADMIN", undefined);

    expect(result).toBe(false);
    expect(verifyTotpCode).not.toHaveBeenCalled();
  });

  it("CASO 4: admin com MFA habilitado e código errado é rejeitado", async () => {
    findUniqueUser.mockResolvedValueOnce({ totpSecret: "SECRET", totpEnabled: true });
    verifyTotpCode.mockReturnValueOnce(false);
    const { checkMfaRequirement } = await import("./mfa");

    const result = await checkMfaRequirement("admin-1", "ADMIN", "000000");

    expect(result).toBe(false);
    expect(verifyTotpCode).toHaveBeenCalledWith("SECRET", "000000");
  });

  it("CASO 5: admin com MFA habilitado e código correto passa", async () => {
    findUniqueUser.mockResolvedValueOnce({ totpSecret: "SECRET", totpEnabled: true });
    verifyTotpCode.mockReturnValueOnce(true);
    const { checkMfaRequirement } = await import("./mfa");

    const result = await checkMfaRequirement("admin-1", "ADMIN", "123456");

    expect(result).toBe(true);
  });

  it("CASO 6: conta admin não encontrada no banco não trava o login (trata como MFA não habilitado)", async () => {
    findUniqueUser.mockResolvedValueOnce(null);
    const { checkMfaRequirement } = await import("./mfa");

    const result = await checkMfaRequirement("admin-inexistente", "ADMIN", undefined);

    expect(result).toBe(true);
  });
});
