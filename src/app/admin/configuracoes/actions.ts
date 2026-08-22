"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authz";
import { recordAuditLog } from "@/lib/audit-log";

export async function toggleUserActiveAction(formData: FormData) {
  const session = await requireAdmin();
  const userId = String(formData.get("userId") ?? "");

  if (!userId) throw new Error("Usuário não informado.");
  if (userId === session.id) throw new Error("Você não pode desativar sua própria conta.");

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("Usuário não encontrado.");

  const active = !user.active;
  await prisma.user.update({ where: { id: user.id }, data: { active } });

  await recordAuditLog({
    actorUserId: session.id,
    action: "UPDATE",
    entity: "User",
    entityId: user.id,
    oldData: { active: user.active, email: user.email },
    newData: { active },
  });

  revalidatePath("/admin/configuracoes");
}
