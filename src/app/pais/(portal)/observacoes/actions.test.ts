import { beforeEach, describe, expect, it, vi } from "vitest";

const requireGuardianChild = vi.fn();
const createNote = vi.fn();
const recordAuditLog = vi.fn();
const notifyAdmins = vi.fn();

beforeEach(() => {
  vi.resetModules();
  vi.doMock("next/cache", () => ({ revalidatePath: () => {} }));
  vi.doMock("@/lib/authz", () => ({ requireGuardianChild: (...args: unknown[]) => requireGuardianChild(...args) }));
  vi.doMock("@/lib/audit-log", () => ({ recordAuditLog: (...args: unknown[]) => recordAuditLog(...args) }));
  vi.doMock("@/lib/notifications", () => ({ notifyAdmins: (...args: unknown[]) => notifyAdmins(...args) }));
  vi.doMock("@/lib/prisma", () => ({ prisma: { childNote: { create: (...args: unknown[]) => createNote(...args) } } }));

  requireGuardianChild.mockReset().mockResolvedValue({ user: { id: "user-1" }, guardian: { id: "guardian-1" } });
  createNote.mockReset().mockResolvedValue({ id: "note-1", child: { preferredName: "Ana", fullName: "Ana Silva" } });
  recordAuditLog.mockReset().mockResolvedValue(undefined);
  notifyAdmins.mockReset().mockResolvedValue(undefined);
});

function formData(fields: Record<string, string>) {
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) fd.set(key, value);
  return fd;
}

describe("sendObservationAction", () => {
  it("CASO 1: recusa observação vazia", async () => {
    const { sendObservationAction } = await import("./actions");
    await expect(sendObservationAction(formData({ childId: "child-1", text: "  " }))).rejects.toThrow(
      "Escreva a observação antes de enviar."
    );
    expect(createNote).not.toHaveBeenCalled();
  });

  it("CASO 2: cria a observação como GUARDIAN/NEW e audita", async () => {
    const { sendObservationAction } = await import("./actions");
    await sendObservationAction(formData({ childId: "child-1", text: "Dormiu tarde ontem." }));

    expect(createNote).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ childId: "child-1", authorRole: "GUARDIAN", authorGuardianId: "guardian-1", status: "NEW" }),
      })
    );
    expect(recordAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ actorUserId: "user-1", action: "CREATE", entity: "ChildNote", entityId: "note-1" })
    );
  });

  it("CASO 3: notifica os admins da nova observação", async () => {
    const { sendObservationAction } = await import("./actions");
    await sendObservationAction(formData({ childId: "child-1", text: "Dormiu tarde ontem." }));

    expect(notifyAdmins).toHaveBeenCalledWith(
      "OBSERVATION",
      expect.any(String),
      expect.stringContaining("Dormiu tarde ontem."),
      { entity: "ChildNote", entityId: "note-1" }
    );
  });
});
