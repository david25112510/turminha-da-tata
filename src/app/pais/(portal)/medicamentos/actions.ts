"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireGuardianChildPermission } from "@/lib/authz";
import { recordAuditLog } from "@/lib/audit-log";
import { notifyAdmins } from "@/lib/notifications";

/**
 * Cadastra uma solicitação de medicamento — sempre nasce PENDING/inativa. A escola precisa
 * confirmar (src/app/admin/medicamentos/actions.ts) antes que a cuidadora consiga administrá-lo
 * (ver a checagem de status em addMedicationAdministrationAction).
 */
export async function requestMedicationAuthorizationAction(formData: FormData) {
  const childId = String(formData.get("childId") ?? "");
  const medication = String(formData.get("medication") ?? "").trim();
  const dosage = String(formData.get("dosage") ?? "").trim();
  const scheduleTime = String(formData.get("scheduleTime") ?? "").trim();
  const instructions = String(formData.get("instructions") ?? "").trim();
  const validFromRaw = String(formData.get("validFrom") ?? "");
  const validUntilRaw = String(formData.get("validUntil") ?? "");

  if (!medication) throw new Error("Informe o nome do medicamento.");
  if (!dosage) throw new Error("Informe a dosagem.");
  if (!validFromRaw) throw new Error("Informe a data de início.");

  const validFrom = new Date(validFromRaw);
  if (Number.isNaN(validFrom.getTime())) throw new Error("Data de início inválida.");
  const validUntil = validUntilRaw ? new Date(validUntilRaw) : null;
  if (validUntil && Number.isNaN(validUntil.getTime())) throw new Error("Data de término inválida.");
  if (validUntil && validUntil < validFrom) throw new Error("A data de término não pode ser anterior à de início.");

  const { user, guardian } = await requireGuardianChildPermission(childId, "authorizeMedication");

  const authorization = await prisma.medicationAuthorization.create({
    data: {
      childId,
      medication,
      dosage,
      scheduleTime: scheduleTime || null,
      instructions: instructions || null,
      authorizedByGuardianId: guardian.id,
      validFrom,
      validUntil,
      active: false,
      status: "PENDING",
    },
    include: { child: true },
  });

  await recordAuditLog({
    actorUserId: user.id,
    action: "CREATE",
    entity: "MedicationAuthorization",
    entityId: authorization.id,
    newData: { childId, medication, dosage, status: "PENDING" },
  });

  await notifyAdmins(
    "MEDICATION",
    "Novo medicamento aguardando confirmação",
    `${authorization.child.preferredName || authorization.child.fullName}: ${medication} (${dosage}).`,
    { entity: "MedicationAuthorization", entityId: authorization.id }
  );

  revalidatePath("/pais/medicamentos");
}
