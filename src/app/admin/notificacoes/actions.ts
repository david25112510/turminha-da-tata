"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authz";

export async function markAdminNotificationReadAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Notificação inválida.");

  await prisma.adminNotification.update({ where: { id }, data: { read: true } });
  revalidatePath("/admin/notificacoes");
  revalidatePath("/admin");
}

export async function markAllAdminNotificationsReadAction() {
  await requireAdmin();
  await prisma.adminNotification.updateMany({ where: { read: false }, data: { read: true } });
  revalidatePath("/admin/notificacoes");
  revalidatePath("/admin");
}
