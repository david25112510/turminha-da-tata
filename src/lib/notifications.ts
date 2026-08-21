import { prisma } from "@/lib/prisma";
import type { NotificationType } from "@prisma/client";
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
    await Promise.all(
      links.map((link) => sendPushToGuardian(link.guardianId, { title, body, url: "/pais" }))
    );
  }
}
