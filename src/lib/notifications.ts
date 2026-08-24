import { prisma } from "@/lib/prisma";
import type { AdminNotificationType, NotificationType } from "@prisma/client";
import { isPushConfigured, sendPushToGuardian } from "@/lib/push";

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
    select: { guardianId: true },
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

  if (isPushConfigured()) {
    const url = `/pais/jornada?childId=${childId}`;
    await Promise.all(links.map((link) => sendPushToGuardian(link.guardianId, { title, body, url })));
  }
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
