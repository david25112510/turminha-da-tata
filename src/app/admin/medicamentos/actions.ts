"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authz";
import { recordAuditLog } from "@/lib/audit-log";
import { notifyGuardians } from "@/lib/notifications";

async function findAuthorizationOrThrow(id: string) {
  const authorization = await prisma.medicationAuthorization.findUnique({ where: { id } });
  if (!authorization) throw new Error("Autorização de medicamento não encontrada.");
  return authorization;
}

export async function approveMedicationAuthorizationAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const authorization = await findAuthorizationOrThrow(id);
  if (authorization.status !== "PENDING") throw new Error("Este medicamento não está pendente de confirmação.");

  await prisma.medicationAuthorization.update({
    where: { id },
    data: { status: "ACTIVE", active: true, reviewedByUserId: admin.id, reviewedAt: new Date(), reviewNotes: null },
  });

  await recordAuditLog({
    actorUserId: admin.id,
    action: "APPROVE",
    entity: "MedicationAuthorization",
    entityId: id,
    oldData: { status: authorization.status },
    newData: { status: "ACTIVE", childId: authorization.childId, medication: authorization.medication },
  });

  await notifyGuardians(
    authorization.childId,
    "MEDICATION",
    "Medicamento confirmado",
    `O medicamento ${authorization.medication} foi confirmado pela escola e já pode ser administrado.`
  );

  revalidatePath("/admin/medicamentos");
}

export async function refuseMedicationAuthorizationAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  if (!reason) throw new Error("Informe o motivo da recusa.");
  const authorization = await findAuthorizationOrThrow(id);
  if (authorization.status !== "PENDING") throw new Error("Este medicamento não está pendente de confirmação.");

  await prisma.medicationAuthorization.update({
    where: { id },
    data: { status: "REFUSED", active: false, reviewedByUserId: admin.id, reviewedAt: new Date(), reviewNotes: reason },
  });

  await recordAuditLog({
    actorUserId: admin.id,
    action: "REFUSE",
    entity: "MedicationAuthorization",
    entityId: id,
    oldData: { status: authorization.status },
    newData: { status: "REFUSED", childId: authorization.childId, medication: authorization.medication, reason },
  });

  await notifyGuardians(
    authorization.childId,
    "MEDICATION",
    "Medicamento não confirmado",
    `O medicamento ${authorization.medication} não pôde ser confirmado pela escola. Motivo: ${reason}`
  );

  revalidatePath("/admin/medicamentos");
}

export async function pauseMedicationAuthorizationAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const authorization = await findAuthorizationOrThrow(id);
  if (authorization.status !== "ACTIVE") throw new Error("Só é possível pausar um medicamento ativo.");

  await prisma.medicationAuthorization.update({
    where: { id },
    data: { status: "PAUSED", active: false, reviewedByUserId: admin.id, reviewedAt: new Date() },
  });

  await recordAuditLog({
    actorUserId: admin.id,
    action: "PAUSE",
    entity: "MedicationAuthorization",
    entityId: id,
    oldData: { status: authorization.status },
    newData: { status: "PAUSED", childId: authorization.childId },
  });

  revalidatePath("/admin/medicamentos");
}

export async function resumeMedicationAuthorizationAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const authorization = await findAuthorizationOrThrow(id);
  if (authorization.status !== "PAUSED") throw new Error("Só é possível retomar um medicamento pausado.");

  await prisma.medicationAuthorization.update({
    where: { id },
    data: { status: "ACTIVE", active: true, reviewedByUserId: admin.id, reviewedAt: new Date() },
  });

  await recordAuditLog({
    actorUserId: admin.id,
    action: "RESUME",
    entity: "MedicationAuthorization",
    entityId: id,
    oldData: { status: authorization.status },
    newData: { status: "ACTIVE", childId: authorization.childId },
  });

  revalidatePath("/admin/medicamentos");
}

export async function endMedicationAuthorizationAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const authorization = await findAuthorizationOrThrow(id);
  if (authorization.status === "ENDED" || authorization.status === "REFUSED") {
    throw new Error("Este medicamento já está encerrado.");
  }

  await prisma.medicationAuthorization.update({
    where: { id },
    data: { status: "ENDED", active: false, reviewedByUserId: admin.id, reviewedAt: new Date() },
  });

  await recordAuditLog({
    actorUserId: admin.id,
    action: "END",
    entity: "MedicationAuthorization",
    entityId: id,
    oldData: { status: authorization.status },
    newData: { status: "ENDED", childId: authorization.childId },
  });

  revalidatePath("/admin/medicamentos");
}
