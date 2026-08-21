"use server";

import { requireGuardian } from "@/lib/guardian";
import { prisma } from "@/lib/prisma";

type SubscriptionInput = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

export async function subscribeToPush(subscription: SubscriptionInput) {
  const guardian = await requireGuardian();

  await prisma.pushSubscription.upsert({
    where: { endpoint: subscription.endpoint },
    create: {
      guardianId: guardian.id,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    },
    update: {
      guardianId: guardian.id,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    },
  });
}

export async function unsubscribeFromPush(endpoint: string) {
  await requireGuardian();
  await prisma.pushSubscription.deleteMany({ where: { endpoint } });
}
