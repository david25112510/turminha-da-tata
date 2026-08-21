"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authz";

export async function toggleUserActiveAction(formData: FormData) {
  const session = await requireAdmin();
  const userId = String(formData.get("userId") ?? "");

  if (!userId) throw new Error("Usuário não informado.");
  if (userId === session.id) throw new Error("Você não pode desativar sua própria conta.");

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("Usuário não encontrado.");

  await prisma.user.update({ where: { id: user.id }, data: { active: !user.active } });
  revalidatePath("/admin/configuracoes");
}
