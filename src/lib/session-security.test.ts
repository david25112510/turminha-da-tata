import { beforeEach, describe, expect, it, vi } from "vitest";

const findUniqueUser = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => findUniqueUser(...args),
    },
  },
}));

describe("revalidateSessionToken", () => {
  beforeEach(() => {
    findUniqueUser.mockReset();
  });

  it("remove identidade e privilégios do JWT quando a conta foi desativada", async () => {
    findUniqueUser.mockResolvedValueOnce({ id: "user-1", role: "CAREGIVER", active: false });
    const { revalidateSessionToken } = await import("./session-security");
    const token = { id: "user-1", role: "CAREGIVER", sub: "user-1", email: "caregiver@example.com" };

    const result = await revalidateSessionToken(token);

    expect(result.id).toBeUndefined();
    expect(result.role).toBeUndefined();
    expect(result.sub).toBeUndefined();
    expect(result.email).toBe("caregiver@example.com");
  });

  it("revoga a identidade quando o usuário não existe mais", async () => {
    findUniqueUser.mockResolvedValueOnce(null);
    const { revalidateSessionToken } = await import("./session-security");
    const result = await revalidateSessionToken({ id: "deleted-user", role: "GUARDIAN", sub: "deleted-user" });

    expect(result.id).toBeUndefined();
    expect(result.role).toBeUndefined();
    expect(result.sub).toBeUndefined();
  });

  it("atualiza o papel do usuário ativo para não confiar em privilégio antigo do JWT", async () => {
    findUniqueUser.mockResolvedValueOnce({ id: "user-1", role: "GUARDIAN", active: true });
    const { revalidateSessionToken } = await import("./session-security");
    const result = await revalidateSessionToken({ id: "user-1", role: "ADMIN", sub: "user-1" });

    expect(result.id).toBe("user-1");
    expect(result.role).toBe("GUARDIAN");
  });

  it("não consulta o banco para token anônimo sem id", async () => {
    const { revalidateSessionToken } = await import("./session-security");
    const token = { name: "visitante" };
    await expect(revalidateSessionToken(token)).resolves.toBe(token);
    expect(findUniqueUser).not.toHaveBeenCalled();
  });
});
