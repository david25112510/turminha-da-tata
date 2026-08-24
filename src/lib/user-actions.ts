import { prisma } from "@/lib/prisma";
import { recordAuditLog } from "@/lib/audit-log";

/** Toggles a user's active flag. Shared by /admin/configuracoes (any role) and /admin/cuidadoras. */
export async function toggleUserActive(userId: string, actorId: string) {
  if (!userId) throw new Error("Usuário não informado.");
  if (userId === actorId) throw new Error("Você não pode desativar sua própria conta.");

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("Usuário não encontrado.");

  const active = !user.active;
  await prisma.user.update({ where: { id: user.id }, data: { active } });

  await recordAuditLog({
    actorUserId: actorId,
    action: "UPDATE",
    entity: "User",
    entityId: user.id,
    oldData: { active: user.active, email: user.email },
    newData: { active },
  });

  return active;
}
