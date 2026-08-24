import { createHash } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

const createToken = vi.fn();
const findUniqueToken = vi.fn();
const updateToken = vi.fn();

beforeEach(() => {
  vi.resetModules();
  vi.doMock("@/lib/prisma", () => ({
    prisma: {
      passwordResetToken: {
        create: (...args: unknown[]) => createToken(...args),
        findUnique: (...args: unknown[]) => findUniqueToken(...args),
        update: (...args: unknown[]) => updateToken(...args),
      },
    },
  }));
  createToken.mockReset().mockResolvedValue(undefined);
  findUniqueToken.mockReset();
  updateToken.mockReset().mockResolvedValue(undefined);
});

function hash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

describe("createPasswordResetToken", () => {
  it("persists only the hash of the token, never the raw value", async () => {
    const { createPasswordResetToken } = await import("./password-reset");
    const token = await createPasswordResetToken("user-1");

    expect(createToken).toHaveBeenCalledOnce();
    const data = (createToken.mock.calls[0][0] as { data: { userId: string; tokenHash: string } }).data;
    expect(data.userId).toBe("user-1");
    expect(data.tokenHash).toBe(hash(token));
    expect(data.tokenHash).not.toBe(token);
  });
});

describe("consumePasswordResetToken", () => {
  it("returns null for an empty token", async () => {
    const { consumePasswordResetToken } = await import("./password-reset");
    expect(await consumePasswordResetToken("")).toBeNull();
    expect(findUniqueToken).not.toHaveBeenCalled();
  });

  it("returns null when no record matches the token hash", async () => {
    findUniqueToken.mockResolvedValueOnce(null);
    const { consumePasswordResetToken } = await import("./password-reset");
    expect(await consumePasswordResetToken("token-inexistente")).toBeNull();
    expect(updateToken).not.toHaveBeenCalled();
  });

  it("returns null and does not consume when the token was already used", async () => {
    findUniqueToken.mockResolvedValueOnce({
      id: "reset-1",
      userId: "user-1",
      usedAt: new Date(),
      expiresAt: new Date(Date.now() + 60_000),
    });
    const { consumePasswordResetToken } = await import("./password-reset");
    expect(await consumePasswordResetToken("token-ja-usado")).toBeNull();
    expect(updateToken).not.toHaveBeenCalled();
  });

  it("returns null and does not consume an expired token", async () => {
    findUniqueToken.mockResolvedValueOnce({
      id: "reset-1",
      userId: "user-1",
      usedAt: null,
      expiresAt: new Date(Date.now() - 60_000),
    });
    const { consumePasswordResetToken } = await import("./password-reset");
    expect(await consumePasswordResetToken("token-expirado")).toBeNull();
    expect(updateToken).not.toHaveBeenCalled();
  });

  it("returns the userId and marks the token as used for a valid token", async () => {
    findUniqueToken.mockResolvedValueOnce({
      id: "reset-1",
      userId: "user-1",
      usedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
    });
    const { consumePasswordResetToken } = await import("./password-reset");
    const userId = await consumePasswordResetToken("token-valido");

    expect(userId).toBe("user-1");
    expect(updateToken).toHaveBeenCalledWith({ where: { id: "reset-1" }, data: { usedAt: expect.any(Date) } });
  });
});
