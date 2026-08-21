"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function toggleUserActiveAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("Não autenticado.");

  const userId = String(formData.get("userId") ?? "");
  const currentActive = formData.get("currentActive") === "true";

  if (userId === session.user.id) {
    throw new Error("Você não pode desativar sua própria conta.");
  }

  await prisma.user.update({ where: { id: userId }, data: { active: !currentActive } });
  revalidatePath("/admin/configuracoes");
}
