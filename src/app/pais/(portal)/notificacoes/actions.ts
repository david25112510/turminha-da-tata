"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireGuardian } from "@/lib/guardian";

export async function markNotificationReadAction(formData: FormData) {
  const guardian = await requireGuardian();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Notificação inválida.");

  // updateMany (não update) para nunca confiar só no id vindo do cliente — só afeta a linha se ela
  // também pertencer ao responsável autenticado; de outra forma, não faz nada (0 linhas afetadas).
  await prisma.notification.updateMany({ where: { id, guardianId: guardian.id }, data: { read: true } });
  revalidatePath("/pais/notificacoes");
  revalidatePath("/pais");
}

export async function markAllNotificationsReadAction() {
  const guardian = await requireGuardian();
  await prisma.notification.updateMany({ where: { guardianId: guardian.id, read: false }, data: { read: true } });
  revalidatePath("/pais/notificacoes");
  revalidatePath("/pais");
}
