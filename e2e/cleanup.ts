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
  // Registros criados durante um teste pela própria UI (ex.: admin cadastrando uma cuidadora em
  // e2e/admin-caregivers.spec.ts, ou criança+responsável em e2e/contract.spec.ts) recebem um cuid gerado
  // pelo Prisma, não um dos IDs fixos abaixo — por isso também casam por convenção de nome: usuários por
  // e-mail com prefixo "e2e-", crianças por nome completo com prefixo "E2E ", responsáveis (Guardian, que
  // tem seu próprio id, separado do User) pelo mesmo prefixo de e-mail.
  const e2eUsers = await prisma.user.findMany({
    where: { OR: [{ id: { in: ALL_E2E_USER_IDS } }, { email: { startsWith: "e2e-" } }] },
    select: { id: true },
  });
  const e2eUserIds = e2eUsers.map((u) => u.id);

  await prisma.child.deleteMany({ where: { OR: [{ id: { in: ALL_E2E_CHILD_IDS } }, { fullName: { startsWith: "E2E " } }] } });
  await prisma.auditLog.deleteMany({ where: { actorUserId: { in: e2eUserIds } } });
  await prisma.adminNotification.deleteMany({ where: { entityId: { in: e2eUserIds } } });
  await prisma.guardian.deleteMany({ where: { OR: [{ id: { in: ALL_E2E_GUARDIAN_IDS } }, { email: { startsWith: "e2e-" } }] } });
  await prisma.user.deleteMany({ where: { id: { in: e2eUserIds } } });
}
