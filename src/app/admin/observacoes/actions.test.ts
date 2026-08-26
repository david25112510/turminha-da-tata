import { beforeEach, describe, expect, it, vi } from "vitest";

const requireAdmin = vi.fn();
const findUniqueNote = vi.fn();
const updateNote = vi.fn();
const recordAuditLog = vi.fn();

beforeEach(() => {
  vi.resetModules();
  vi.doMock("next/cache", () => ({ revalidatePath: () => {} }));
  vi.doMock("@/lib/authz", () => ({ requireAdmin: (...args: unknown[]) => requireAdmin(...args) }));
  vi.doMock("@/lib/audit-log", () => ({ recordAuditLog: (...args: unknown[]) => recordAuditLog(...args) }));
  vi.doMock("@/lib/prisma", () => ({
    prisma: {
      childNote: {
        findUnique: (...args: unknown[]) => findUniqueNote(...args),
        update: (...args: unknown[]) => updateNote(...args),
      },
    },
  }));

  requireAdmin.mockReset().mockResolvedValue({ id: "admin-1" });
  findUniqueNote.mockReset();
  updateNote.mockReset().mockResolvedValue(undefined);
  recordAuditLog.mockReset().mockResolvedValue(undefined);
});

function formData(fields: Record<string, string>) {
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) fd.set(key, value);
  return fd;
}

describe("updateObservationStatusAction", () => {
  it("CASO 1: recusa um status inválido", async () => {
    const { updateObservationStatusAction } = await import("./actions");
    await expect(updateObservationStatusAction(formData({ id: "note-1", status: "BOGUS" }))).rejects.toThrow(
      "Status inválido."
    );
    expect(findUniqueNote).not.toHaveBeenCalled();
  });

  it("CASO 2: recusa quando a observação não existe", async () => {
    findUniqueNote.mockResolvedValueOnce(null);
    const { updateObservationStatusAction } = await import("./actions");
    await expect(updateObservationStatusAction(formData({ id: "note-1", status: "READ" }))).rejects.toThrow(
      "Observação não encontrada."
    );
  });

  it("CASO 3: recusa alterar uma nota que não é da família (authorRole CAREGIVER)", async () => {
    findUniqueNote.mockResolvedValueOnce({ id: "note-1", authorRole: "CAREGIVER", status: "NEW" });
    const { updateObservationStatusAction } = await import("./actions");
    await expect(updateObservationStatusAction(formData({ id: "note-1", status: "READ" }))).rejects.toThrow(
      "Observação não encontrada."
    );
    expect(updateNote).not.toHaveBeenCalled();
  });

  it("CASO 4: atualiza o status e grava oldData/newData no AuditLog", async () => {
    findUniqueNote.mockResolvedValueOnce({ id: "note-1", authorRole: "GUARDIAN", status: "NEW" });
    const { updateObservationStatusAction } = await import("./actions");

    await updateObservationStatusAction(formData({ id: "note-1", status: "READ" }));

    expect(updateNote).toHaveBeenCalledWith({ where: { id: "note-1" }, data: { status: "READ" } });
    expect(recordAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: "admin-1",
        action: "UPDATE",
        entity: "ChildNote",
        entityId: "note-1",
        oldData: { status: "NEW" },
        newData: { status: "READ" },
      })
    );
  });
});
