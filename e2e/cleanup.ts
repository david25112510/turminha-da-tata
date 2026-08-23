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
  await prisma.child.deleteMany({ where: { id: { in: ALL_E2E_CHILD_IDS } } });
  await prisma.auditLog.deleteMany({ where: { actorUserId: { in: ALL_E2E_USER_IDS } } });
  await prisma.guardian.deleteMany({ where: { id: { in: ALL_E2E_GUARDIAN_IDS } } });
  await prisma.user.deleteMany({ where: { id: { in: ALL_E2E_USER_IDS } } });
}
