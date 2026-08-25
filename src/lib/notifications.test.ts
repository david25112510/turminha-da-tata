import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * notifyGuardians sempre cria a Notification in-app; o que muda entre os casos é o canal externo:
 * push é a preferência, e-mail é fallback só para quem nunca habilitou push neste dispositivo
 * (sendPushToGuardian retornando false) — nunca os dois juntos, e nunca e-mail quando o guardian não
 * tem e-mail cadastrado ou o Resend não está configurado.
 */

const findManyGuardianChild = vi.fn();
const createManyNotification = vi.fn();
const isPushConfigured = vi.fn();
const sendPushToGuardian = vi.fn();
const isEmailConfigured = vi.fn();
const sendEmail = vi.fn();

beforeEach(() => {
  vi.resetModules();
  vi.doMock("@/lib/prisma", () => ({
    prisma: {
      guardianChild: { findMany: (...args: unknown[]) => findManyGuardianChild(...args) },
      notification: { createMany: (...args: unknown[]) => createManyNotification(...args) },
    },
  }));
  vi.doMock("@/lib/push", () => ({
    isPushConfigured: (...args: unknown[]) => isPushConfigured(...args),
    sendPushToGuardian: (...args: unknown[]) => sendPushToGuardian(...args),
  }));
  vi.doMock("@/lib/email", () => ({
    isEmailConfigured: (...args: unknown[]) => isEmailConfigured(...args),
    sendEmail: (...args: unknown[]) => sendEmail(...args),
  }));

  findManyGuardianChild.mockReset().mockResolvedValue([
    { guardianId: "guardian-1", guardian: { email: "mae@example.com", name: "Mãe da Maria" } },
  ]);
  createManyNotification.mockReset().mockResolvedValue({ count: 1 });
  isPushConfigured.mockReset().mockReturnValue(true);
  sendPushToGuardian.mockReset().mockResolvedValue(true);
  isEmailConfigured.mockReset().mockReturnValue(true);
  sendEmail.mockReset().mockResolvedValue(undefined);
});

describe("notifyGuardians", () => {
  it("CASO 1: push habilitado (assinatura existe) não envia e-mail", async () => {
    sendPushToGuardian.mockResolvedValueOnce(true);
    const { notifyGuardians } = await import("./notifications");

    await notifyGuardians("child-1", "ARRIVAL", "Chegada", "Maria chegou.");

    expect(sendPushToGuardian).toHaveBeenCalledOnce();
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("CASO 2: sem push habilitado (sendPushToGuardian retorna false) cai para e-mail", async () => {
    sendPushToGuardian.mockResolvedValueOnce(false);
    const { notifyGuardians } = await import("./notifications");

    await notifyGuardians("child-1", "ARRIVAL", "Chegada", "Maria chegou.");

    expect(sendEmail).toHaveBeenCalledOnce();
    expect(sendEmail.mock.calls[0][0]).toMatchObject({ to: "mae@example.com", subject: "Chegada" });
  });

  it("CASO 3: push nem configurado no servidor (isPushConfigured false) também cai para e-mail, sem tentar enviar push", async () => {
    isPushConfigured.mockReturnValueOnce(false);
    const { notifyGuardians } = await import("./notifications");

    await notifyGuardians("child-1", "ARRIVAL", "Chegada", "Maria chegou.");

    expect(sendPushToGuardian).not.toHaveBeenCalled();
    expect(sendEmail).toHaveBeenCalledOnce();
  });

  it("CASO 4: sem push e sem Resend configurado, não envia e-mail (só a Notification in-app)", async () => {
    sendPushToGuardian.mockResolvedValueOnce(false);
    isEmailConfigured.mockReturnValueOnce(false);
    const { notifyGuardians } = await import("./notifications");

    await notifyGuardians("child-1", "ARRIVAL", "Chegada", "Maria chegou.");

    expect(sendEmail).not.toHaveBeenCalled();
    expect(createManyNotification).toHaveBeenCalledOnce();
  });

  it("CASO 5: guardian sem e-mail cadastrado não recebe e-mail mesmo sem push", async () => {
    findManyGuardianChild.mockResolvedValueOnce([{ guardianId: "guardian-2", guardian: { email: null, name: "Pai do João" } }]);
    sendPushToGuardian.mockResolvedValueOnce(false);
    const { notifyGuardians } = await import("./notifications");

    await notifyGuardians("child-1", "ARRIVAL", "Chegada", "João chegou.");

    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("CASO 6: nenhum guardian com receiveNotifications (findMany vazio) não cria Notification nem tenta nenhum canal", async () => {
    findManyGuardianChild.mockResolvedValueOnce([]);
    const { notifyGuardians } = await import("./notifications");

    await notifyGuardians("child-1", "ARRIVAL", "Chegada", "Maria chegou.");

    expect(createManyNotification).not.toHaveBeenCalled();
    expect(sendPushToGuardian).not.toHaveBeenCalled();
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("respeita requirePermission na query de guardianChild", async () => {
    const { notifyGuardians } = await import("./notifications");
    await notifyGuardians("child-1", "FINANCIAL", "Fatura", "Nova fatura disponível.", "viewFinancial");

    expect(findManyGuardianChild).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ viewFinancial: true }) })
    );
  });
});
