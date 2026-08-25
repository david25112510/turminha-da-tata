import { prisma } from "@/lib/prisma";
import type { AdminNotificationType, NotificationType } from "@prisma/client";
import { isPushConfigured, sendPushToGuardian } from "@/lib/push";
import { isEmailConfigured, sendEmail } from "@/lib/email";

export async function notifyGuardians(
  childId: string,
  type: NotificationType,
  title: string,
  body: string,
  requirePermission?: "viewFinancial" | "viewPhotos" | "viewRoutine"
) {
  const links = await prisma.guardianChild.findMany({
    where: {
      childId,
      receiveNotifications: true,
      ...(requirePermission ? { [requirePermission]: true } : {}),
    },
    select: { guardianId: true, guardian: { select: { email: true, name: true } } },
  });

  if (links.length === 0) return;

  await prisma.notification.createMany({
    data: links.map((link) => ({
      guardianId: link.guardianId,
      childId,
      type,
      title,
      body,
    })),
  });

  const url = `/pais/jornada?childId=${childId}`;
  const emailConfigured = isEmailConfigured();
  const pushConfigured = isPushConfigured();

  await Promise.all(
    links.map(async (link) => {
      // Push é a preferência; e-mail é só fallback para quem nunca habilitou push neste dispositivo
      // (sendPushToGuardian retorna false nesse caso — não quando uma entrega falha isoladamente).
      const pushSent = pushConfigured && (await sendPushToGuardian(link.guardianId, { title, body, url }));
      if (!pushSent && emailConfigured && link.guardian.email) {
        await sendEmail({
          to: link.guardian.email,
          subject: title,
          html: `<p>Olá, ${link.guardian.name}.</p><p>${body}</p><p><a href="${(process.env.APP_URL ?? "http://localhost:3000") + url}">Ver no Portal dos Pais</a></p>`,
        });
      }
    })
  );
}

/**
 * Records an admin-facing notification. Deliberately narrow — only called for events worth surfacing
 * (incidents, medication, overdue invoices, new caregiver), not every routine registro.
 */
export async function notifyAdmins(
  type: AdminNotificationType,
  title: string,
  body: string,
  entity?: { entity: string; entityId: string }
) {
  await prisma.adminNotification.create({
    data: { type, title, body, entity: entity?.entity, entityId: entity?.entityId },
  });
}
