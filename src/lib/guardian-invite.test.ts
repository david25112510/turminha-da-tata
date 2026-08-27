import { createHash } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

const createInvite = vi.fn();
const findUniqueInvite = vi.fn();
const updateManyInvite = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    guardianInvite: {
      create: (...args: unknown[]) => createInvite(...args),
      findUnique: (...args: unknown[]) => findUniqueInvite(...args),
      updateMany: (...args: unknown[]) => updateManyInvite(...args),
    },
  },
}));

beforeEach(() => {
  createInvite.mockReset();
  findUniqueInvite.mockReset();
  updateManyInvite.mockReset();
});

function hashOf(code: string) {
  return createHash("sha256").update(code).digest("hex");
}

describe("createGuardianInvite", () => {
  it("CASO 1: gera um código de 8 caracteres hex e grava só o hash", async () => {
    createInvite.mockResolvedValueOnce({ id: "invite-1" });
    const { createGuardianInvite } = await import("./guardian-invite");

    const result = await createGuardianInvite("child-1", "admin-1");

    expect(result.id).toBe("invite-1");
    expect(result.code).toMatch(/^[0-9A-F]{8}$/);
    const data = (createInvite.mock.calls[0][0] as { data: { codeHash: string } }).data;
    expect(data.codeHash).toBe(hashOf(result.code));
    expect(data.codeHash).not.toBe(result.code);
  });

  it("CASO 2: expira em 7 dias a partir de agora", async () => {
    createInvite.mockResolvedValueOnce({ id: "invite-1" });
    const before = Date.now();
    const { createGuardianInvite } = await import("./guardian-invite");

    await createGuardianInvite("child-1", "admin-1");

    const data = (createInvite.mock.calls[0][0] as { data: { expiresAt: Date } }).data;
    const days = (data.expiresAt.getTime() - before) / (24 * 60 * 60 * 1000);
    expect(days).toBeGreaterThan(6.9);
    expect(days).toBeLessThan(7.1);
  });
});

describe("consumeGuardianInvite", () => {
  it("CASO 1: rejeita um código vazio sem consultar o banco", async () => {
    const { consumeGuardianInvite } = await import("./guardian-invite");
    const result = await consumeGuardianInvite("");
    expect(result).toBeNull();
    expect(findUniqueInvite).not.toHaveBeenCalled();
  });

  it("CASO 2: rejeita quando o código não existe", async () => {
    findUniqueInvite.mockResolvedValueOnce(null);
    const { consumeGuardianInvite } = await import("./guardian-invite");
    const result = await consumeGuardianInvite("AAAAAAAA");
    expect(result).toBeNull();
    expect(updateManyInvite).not.toHaveBeenCalled();
  });

  it("CASO 3: rejeita um código já usado", async () => {
    findUniqueInvite.mockResolvedValueOnce({ id: "invite-1", childId: "child-1", status: "USED", expiresAt: new Date(Date.now() + 100000) });
    const { consumeGuardianInvite } = await import("./guardian-invite");
    const result = await consumeGuardianInvite("AAAAAAAA");
    expect(result).toBeNull();
    expect(updateManyInvite).not.toHaveBeenCalled();
  });

  it("CASO 4: rejeita um código expirado", async () => {
    findUniqueInvite.mockResolvedValueOnce({ id: "invite-1", childId: "child-1", status: "PENDING", expiresAt: new Date(Date.now() - 1000) });
    const { consumeGuardianInvite } = await import("./guardian-invite");
    const result = await consumeGuardianInvite("AAAAAAAA");
    expect(result).toBeNull();
    expect(updateManyInvite).not.toHaveBeenCalled();
  });

  it("CASO 5: consome um código válido e devolve id/childId", async () => {
    findUniqueInvite.mockResolvedValueOnce({ id: "invite-1", childId: "child-1", status: "PENDING", expiresAt: new Date(Date.now() + 100000) });
    updateManyInvite.mockResolvedValueOnce({ count: 1 });
    const { consumeGuardianInvite } = await import("./guardian-invite");

    const result = await consumeGuardianInvite("aaaaaaaa");

    expect(result).toEqual({ id: "invite-1", childId: "child-1" });
    expect(updateManyInvite).toHaveBeenCalledWith({
      where: { id: "invite-1", status: "PENDING" },
      data: { status: "USED", usedAt: expect.any(Date) },
    });
  });

  it("CASO 6: corrida — duas chamadas simultâneas só a primeira consegue consumir", async () => {
    findUniqueInvite.mockResolvedValue({ id: "invite-1", childId: "child-1", status: "PENDING", expiresAt: new Date(Date.now() + 100000) });
    updateManyInvite.mockResolvedValueOnce({ count: 0 }); // outra requisição já ganhou a corrida
    const { consumeGuardianInvite } = await import("./guardian-invite");

    const result = await consumeGuardianInvite("AAAAAAAA");

    expect(result).toBeNull();
  });

  it("CASO 7: normaliza o código (case-insensitive, remove espaços)", async () => {
    findUniqueInvite.mockResolvedValueOnce({ id: "invite-1", childId: "child-1", status: "PENDING", expiresAt: new Date(Date.now() + 100000) });
    updateManyInvite.mockResolvedValueOnce({ count: 1 });
    const { consumeGuardianInvite } = await import("./guardian-invite");

    await consumeGuardianInvite("  a1b2c3d4  ");

    expect(findUniqueInvite).toHaveBeenCalledWith({ where: { codeHash: hashOf("A1B2C3D4") } });
  });
});
