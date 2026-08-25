import { beforeEach, describe, expect, it, vi } from "vitest";

const requireGuardian = vi.fn();
const updateManyNotification = vi.fn();

beforeEach(() => {
  vi.resetModules();
  vi.doMock("next/cache", () => ({ revalidatePath: () => {} }));
  vi.doMock("@/lib/guardian", () => ({ requireGuardian: (...args: unknown[]) => requireGuardian(...args) }));
  vi.doMock("@/lib/prisma", () => ({
    prisma: { notification: { updateMany: (...args: unknown[]) => updateManyNotification(...args) } },
  }));
  requireGuardian.mockReset().mockResolvedValue({ id: "guardian-1" });
  updateManyNotification.mockReset().mockResolvedValue({ count: 1 });
});

function formData(id: string) {
  const fd = new FormData();
  fd.set("id", id);
  return fd;
}

describe("markNotificationReadAction", () => {
  it("marca como lida escopando ao guardianId da sessão — nunca confia só no id vindo do cliente", async () => {
    const { markNotificationReadAction } = await import("./actions");
    await markNotificationReadAction(formData("notification-1"));

    expect(updateManyNotification).toHaveBeenCalledWith({
      where: { id: "notification-1", guardianId: "guardian-1" },
      data: { read: true },
    });
  });

  it("recusa quando nenhum id é informado", async () => {
    const { markNotificationReadAction } = await import("./actions");
    await expect(markNotificationReadAction(new FormData())).rejects.toThrow("Notificação inválida.");
    expect(updateManyNotification).not.toHaveBeenCalled();
  });
});

describe("markAllNotificationsReadAction", () => {
  it("marca só as não lidas do responsável autenticado", async () => {
    const { markAllNotificationsReadAction } = await import("./actions");
    await markAllNotificationsReadAction();

    expect(updateManyNotification).toHaveBeenCalledWith({
      where: { guardianId: "guardian-1", read: false },
      data: { read: true },
    });
  });
});
