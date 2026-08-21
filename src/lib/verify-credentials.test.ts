import bcrypt from "bcryptjs";
import { describe, expect, it, vi } from "vitest";

const findUnique = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: { user: { findUnique: (...args: unknown[]) => findUnique(...args) } },
}));

const { verifyCredentials } = await import("./verify-credentials");

describe("verifyCredentials", () => {
  it("returns null when email or password is missing", async () => {
    expect(await verifyCredentials(undefined, "x")).toBeNull();
    expect(await verifyCredentials("a@b.com", undefined)).toBeNull();
    expect(findUnique).not.toHaveBeenCalled();
  });

  it("returns null when the user does not exist", async () => {
    findUnique.mockResolvedValueOnce(null);
    expect(await verifyCredentials("ghost@example.com", "whatever")).toBeNull();
  });

  it("returns null when the user is inactive", async () => {
    findUnique.mockResolvedValueOnce({
      id: "1",
      email: "inactive@example.com",
      name: "Inativo",
      role: "CAREGIVER",
      active: false,
      passwordHash: await bcrypt.hash("correct", 10),
    });
    expect(await verifyCredentials("inactive@example.com", "correct")).toBeNull();
  });

  it("returns null when the password is wrong", async () => {
    findUnique.mockResolvedValueOnce({
      id: "1",
      email: "a@b.com",
      name: "Alguém",
      role: "ADMIN",
      active: true,
      passwordHash: await bcrypt.hash("correct-password", 10),
    });
    expect(await verifyCredentials("a@b.com", "wrong-password")).toBeNull();
  });

  it("returns the user (without the password hash) when credentials are valid", async () => {
    findUnique.mockResolvedValueOnce({
      id: "user-1",
      email: "a@b.com",
      name: "Alguém",
      role: "ADMIN",
      active: true,
      passwordHash: await bcrypt.hash("correct-password", 10),
    });

    const result = await verifyCredentials("a@b.com", "correct-password");
    expect(result).toEqual({ id: "user-1", email: "a@b.com", name: "Alguém", role: "ADMIN" });
    expect(result).not.toHaveProperty("passwordHash");
  });
});
