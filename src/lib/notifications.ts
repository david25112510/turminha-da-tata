import { prisma } from "@/lib/prisma";
import type { NotificationType } from "@prisma/client";

export async function notifyGuardians(
  childId: string,
  type: NotificationType,
  title: string,
  body: string
) {
  const links = await prisma.guardianChild.findMany({
    where: { childId, receiveNotifications: true },
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
}
