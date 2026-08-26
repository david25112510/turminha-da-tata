import { beforeEach, describe, expect, it, vi } from "vitest";

const requireAdmin = vi.fn();
const findUniquePhoto = vi.fn();
const deletePhoto = vi.fn();
const recordAuditLog = vi.fn();

beforeEach(() => {
  vi.resetModules();
  vi.doMock("next/cache", () => ({ revalidatePath: () => {} }));
  vi.doMock("@/lib/authz", () => ({ requireAdmin: (...args: unknown[]) => requireAdmin(...args) }));
  vi.doMock("@/lib/audit-log", () => ({ recordAuditLog: (...args: unknown[]) => recordAuditLog(...args) }));
  vi.doMock("@/lib/prisma", () => ({
    prisma: {
      photo: {
        findUnique: (...args: unknown[]) => findUniquePhoto(...args),
        delete: (...args: unknown[]) => deletePhoto(...args),
      },
    },
  }));

  requireAdmin.mockReset().mockResolvedValue({ id: "admin-1" });
  findUniquePhoto.mockReset();
  deletePhoto.mockReset().mockResolvedValue(undefined);
  recordAuditLog.mockReset().mockResolvedValue(undefined);
});

function formData(fields: Record<string, string>) {
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) fd.set(key, value);
  return fd;
}

describe("removePhotoAction", () => {
  it("CASO 1: exige o motivo da remoção, sem sequer consultar a foto", async () => {
    const { removePhotoAction } = await import("./actions");
    await expect(removePhotoAction(formData({ id: "photo-1", reason: "" }))).rejects.toThrow(
      "Informe o motivo da remoção."
    );
    expect(findUniquePhoto).not.toHaveBeenCalled();
  });

  it("CASO 2: recusa quando a foto não existe", async () => {
    findUniquePhoto.mockResolvedValueOnce(null);
    const { removePhotoAction } = await import("./actions");
    await expect(removePhotoAction(formData({ id: "photo-1", reason: "Duplicada" }))).rejects.toThrow(
      "Foto não encontrada."
    );
    expect(deletePhoto).not.toHaveBeenCalled();
  });

  it("CASO 3: audita antes de apagar (nunca silenciosamente) e depois remove o registro", async () => {
    findUniquePhoto.mockResolvedValueOnce({
      id: "photo-1",
      childId: "child-1",
      url: "/uploads/foto.jpg",
      caption: "Pintura",
      takenAt: new Date(2026, 7, 1),
      child: { preferredName: "Ana", fullName: "Ana Silva" },
    });
    const callOrder: string[] = [];
    recordAuditLog.mockImplementationOnce(async () => {
      callOrder.push("audit");
    });
    deletePhoto.mockImplementationOnce(async () => {
      callOrder.push("delete");
    });

    const { removePhotoAction } = await import("./actions");
    await removePhotoAction(formData({ id: "photo-1", reason: "Solicitado pela família" }));

    expect(recordAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: "admin-1",
        action: "DELETE",
        entity: "Photo",
        entityId: "photo-1",
        oldData: expect.objectContaining({ childId: "child-1", url: "/uploads/foto.jpg", caption: "Pintura" }),
        newData: { reason: "Solicitado pela família" },
      })
    );
    expect(deletePhoto).toHaveBeenCalledWith({ where: { id: "photo-1" } });
    expect(callOrder).toEqual(["audit", "delete"]);
  });
});
