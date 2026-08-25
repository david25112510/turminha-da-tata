import webPush from "web-push";
import { prisma } from "@/lib/prisma";

let configured = false;

function ensureConfigured() {
  if (configured) return;

  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;

  if (!publicKey || !privateKey || !subject) {
    throw new Error("VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY e VAPID_SUBJECT precisam estar configurados.");
  }

  webPush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
}

export function isPushConfigured() {
  return Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_SUBJECT);
}

type PushPayload = { title: string; body: string; url?: string };

/**
 * Envia push para toda assinatura registrada de um guardian, podando assinaturas mortas. Retorna se
 * havia pelo menos uma assinatura para tentar — "false" significa "esse responsável nunca habilitou
 * push neste dispositivo", o sinal que src/lib/notifications.ts usa para cair no fallback de e-mail.
 * Não é sobre sucesso de entrega de uma assinatura já existente (isso não tenta detectar).
 */
export async function sendPushToGuardian(guardianId: string, payload: PushPayload): Promise<boolean> {
  if (!isPushConfigured()) return false;
  ensureConfigured();

  const subscriptions = await prisma.pushSubscription.findMany({ where: { guardianId } });
  if (subscriptions.length === 0) return false;

  const body = JSON.stringify(payload);

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webPush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          body
        );
      } catch (error) {
        const statusCode = (error as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
        }
      }
    })
  );

  return true;
}
