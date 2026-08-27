import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * uploadChildPhotoAction — nenhum teste existia para este arquivo antes da validação por magic
 * bytes (src/lib/file-validation.ts) substituir a checagem por file.type. Cobre especificamente o
 * caso que a mudança existe para prevenir: um arquivo cujo file.type mente sobre o conteúdo real.
 */

const authMock = vi.fn();
const requireAdmin = vi.fn();
const requireCaregiver = vi.fn();
const requireActiveChild = vi.fn();
const findUniqueChild = vi.fn();
const createPhoto = vi.fn();
const uploadFile = vi.fn();
const notifyGuardians = vi.fn();

beforeEach(() => {
  vi.resetModules();
  vi.doMock("next/cache", () => ({ revalidatePath: () => {} }));
  vi.doMock("@/auth", () => ({ auth: (...args: unknown[]) => authMock(...args) }));
  vi.doMock("@/lib/authz", () => ({
    requireAdmin: (...args: unknown[]) => requireAdmin(...args),
    requireCaregiver: (...args: unknown[]) => requireCaregiver(...args),
    requireActiveChild: (...args: unknown[]) => requireActiveChild(...args),
  }));
  vi.doMock("@/lib/storage", () => ({ uploadFile: (...args: unknown[]) => uploadFile(...args) }));
  vi.doMock("@/lib/notifications", () => ({ notifyGuardians: (...args: unknown[]) => notifyGuardians(...args) }));
  vi.doMock("@/lib/prisma", () => ({
    prisma: {
      child: { findUnique: (...args: unknown[]) => findUniqueChild(...args) },
      photo: { create: (...args: unknown[]) => createPhoto(...args) },
    },
  }));

  authMock.mockReset().mockResolvedValue({ user: { id: "caregiver-1", role: "CAREGIVER" } });
  requireAdmin.mockReset().mockResolvedValue({ id: "admin-1" });
  requireCaregiver.mockReset().mockResolvedValue({ id: "caregiver-1" });
  requireActiveChild.mockReset().mockResolvedValue({ id: "child-1", status: "ACTIVE" });
  findUniqueChild.mockReset().mockResolvedValue({ id: "child-1", fullName: "Maria Silva", preferredName: "Maria", imageAuthInternal: true });
  createPhoto.mockReset().mockResolvedValue({ id: "photo-1" });
  uploadFile.mockReset().mockResolvedValue("https://storage.example.com/children/child-1/foto.png");
  notifyGuardians.mockReset().mockResolvedValue(undefined);
});

const PNG_BYTES = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);

function formData(fields: Record<string, string>, file?: File) {
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) fd.set(key, value);
  if (file) fd.set("photo", file);
  return fd;
}

describe("uploadChildPhotoAction", () => {
  it("CASO 1: aceita um PNG real e grava a Photo com o tipo detectado pelos magic bytes", async () => {
    const file = new File([PNG_BYTES], "foto.png", { type: "image/png" });
    const { uploadChildPhotoAction } = await import("./photo-actions");

    await uploadChildPhotoAction(formData({ childId: "child-1", caption: "Pintura" }, file));

    expect(uploadFile).toHaveBeenCalledWith(expect.stringContaining("children/child-1/"), expect.any(Buffer), "image/png");
    expect(createPhoto).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ childId: "child-1", caption: "Pintura", uploadedById: "caregiver-1" }) })
    );
    expect(notifyGuardians).toHaveBeenCalled();
  });

  it("CASO 2: rejeita um arquivo cujo file.type diz PNG mas o conteúdo real não é uma imagem (forjado)", async () => {
    const forged = new File([new TextEncoder().encode("<script>alert(1)</script>")], "foto.png", { type: "image/png" });
    const { uploadChildPhotoAction } = await import("./photo-actions");

    await expect(uploadChildPhotoAction(formData({ childId: "child-1" }, forged))).rejects.toThrow(
      "Formato de imagem não suportado."
    );
    expect(uploadFile).not.toHaveBeenCalled();
    expect(createPhoto).not.toHaveBeenCalled();
  });

  it("CASO 3: recusa quando a criança não tem autorização de imagem", async () => {
    findUniqueChild.mockResolvedValueOnce({ id: "child-1", fullName: "Maria Silva", preferredName: "Maria", imageAuthInternal: false });
    const file = new File([PNG_BYTES], "foto.png", { type: "image/png" });
    const { uploadChildPhotoAction } = await import("./photo-actions");

    await expect(uploadChildPhotoAction(formData({ childId: "child-1" }, file))).rejects.toThrow(
      "Esta criança não possui autorização de imagem."
    );
    expect(uploadFile).not.toHaveBeenCalled();
  });

  it("CASO 4: recusa um responsável (GUARDIAN) tentando publicar foto", async () => {
    authMock.mockResolvedValueOnce({ user: { id: "guardian-1", role: "GUARDIAN" } });
    const file = new File([PNG_BYTES], "foto.png", { type: "image/png" });
    const { uploadChildPhotoAction } = await import("./photo-actions");

    await expect(uploadChildPhotoAction(formData({ childId: "child-1" }, file))).rejects.toThrow(
      "Você não tem permissão para publicar fotos."
    );
  });

  it("recusa sem arquivo selecionado", async () => {
    const { uploadChildPhotoAction } = await import("./photo-actions");
    await expect(uploadChildPhotoAction(formData({ childId: "child-1" }))).rejects.toThrow(
      "Selecione um arquivo de imagem."
    );
  });
});
