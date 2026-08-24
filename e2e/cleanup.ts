import { prisma } from "./prisma-client";
import { ALL_E2E_CHILD_IDS, ALL_E2E_GUARDIAN_IDS, ALL_E2E_USER_IDS } from "./fixtures";

/**
 * Remove todo dado de teste e2e-*, na ordem que respeita as FKs. Chamada tanto no global-setup (limpa
 * sobras de uma execução anterior interrompida, antes de recriar) quanto no global-teardown (limpeza final).
 * Deletar Child primeiro cascade a quase tudo (Attendance, MealRecord, SleepRecord, GuardianChild,
 * AuthorizedPickupPerson, MedicationAuthorization, Notification, InvoiceItem, etc. — ver onDelete: Cascade
 * em cada relação com Child no schema). AuditLog e User não são filhos de Child, removidos à parte.
 */
export async function cleanupE2EData() {
  // Usuários criados durante um teste pela própria UI (ex.: admin cadastrando uma cuidadora em
  // e2e/admin-caregivers.spec.ts) recebem um cuid gerado pelo Prisma, não um dos IDs fixos abaixo — por
  // isso também casam por e-mail com prefixo "e2e-", que todo usuário de teste (fixo ou criado em runtime)
  // usa por convenção.
  const e2eUsers = await prisma.user.findMany({
    where: { OR: [{ id: { in: ALL_E2E_USER_IDS } }, { email: { startsWith: "e2e-" } }] },
    select: { id: true },
  });
  const e2eUserIds = e2eUsers.map((u) => u.id);

  await prisma.child.deleteMany({ where: { id: { in: ALL_E2E_CHILD_IDS } } });
  await prisma.auditLog.deleteMany({ where: { actorUserId: { in: e2eUserIds } } });
  await prisma.adminNotification.deleteMany({ where: { entityId: { in: e2eUserIds } } });
  await prisma.guardian.deleteMany({ where: { id: { in: ALL_E2E_GUARDIAN_IDS } } });
  await prisma.user.deleteMany({ where: { id: { in: e2eUserIds } } });
}
