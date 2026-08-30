"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authz";
import { getCurrentContractVersion } from "@/lib/contract";
import { getCurrentConsentVersion } from "@/lib/consent";
import { getCurrentPrivacyPolicyVersion } from "@/lib/privacy-policy";
import { recordAuditLog } from "@/lib/audit-log";

function money(value: FormDataEntryValue | null, fallback: number) { const parsed = Number(String(value ?? "").replace(",", ".")); return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback; }

export async function markEnrollmentUnderReviewAction(formData: FormData) {
  const admin = await requireAdmin(); const id = String(formData.get("id") ?? "");
  const updated = await prisma.enrollmentRequest.updateMany({ where: { id, status: "SUBMITTED" }, data: { status: "UNDER_REVIEW", reviewedByUserId: admin.id, reviewedAt: new Date() } });
  if (!updated.count) throw new Error("Matrícula não encontrada ou já analisada.");
  await recordAuditLog({ actorUserId: admin.id, action: "MATRICULA_EM_ANALISE", entity: "EnrollmentRequest", entityId: id, oldData: { status: "SUBMITTED" }, newData: { status: "UNDER_REVIEW" } });
  revalidatePath(`/admin/matriculas/${id}`); revalidatePath("/admin/matriculas");
}

export async function approveEnrollmentAction(formData: FormData) {
  const admin = await requireAdmin(); const id = String(formData.get("id") ?? "");
  const [contract, consent, privacy] = await Promise.all([getCurrentContractVersion(prisma, admin.id), getCurrentConsentVersion(prisma, admin.id), getCurrentPrivacyPolicyVersion(prisma, admin.id)]);
  const result = await prisma.$transaction(async (tx) => {
    const claimed = await tx.enrollmentRequest.updateMany({ where: { id, status: { in: ["SUBMITTED", "UNDER_REVIEW"] } }, data: { status: "UNDER_REVIEW", reviewedByUserId: admin.id, reviewedAt: new Date() } });
    if (!claimed.count) { const existing = await tx.enrollmentRequest.findUnique({ where: { id } }); if (existing?.status === "APPROVED" && existing.approvedChildId) return { childId: existing.approvedChildId, alreadyApproved: true, guardianId: existing.guardianId }; throw new Error("Matrícula não encontrada ou já encerrada."); }
    const request = await tx.enrollmentRequest.findUniqueOrThrow({ where: { id }, include: { authorizedPeople: true } });
    const existingChild = request.childCpf ? await tx.child.findFirst({ where: { cpf: request.childCpf } }) : await tx.child.findFirst({ where: { fullName: { equals: request.childFullName, mode: "insensitive" }, birthDate: request.childBirthDate } });
    const child = existingChild ?? await tx.child.create({ data: { fullName: request.childFullName, preferredName: request.childPreferredName, birthDate: request.childBirthDate, sex: request.childSex, cpf: request.childCpf, birthCertificate: request.birthCertificate, photoUrl: request.childPhotoUrl, generalNotes: request.generalNotes, contractedEntryTime: String(formData.get("contractedEntryTime") || "07:30"), contractedExitTime: String(formData.get("contractedExitTime") || "17:30"), contractedDays: formData.getAll("contractedDays").map(String).length ? formData.getAll("contractedDays").map(String) : ["MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY"], toleranceMinutes: Number(formData.get("toleranceMinutes") || 0), monthlyFee: money(formData.get("monthlyFee"), 0), overtimeHourRate: money(formData.get("overtimeHourRate"), 0), dueDay: Math.min(28, Math.max(1, Number(formData.get("dueDay") || 10))), imageAuthInternal: request.imageAuthInternal, imageAuthGuardianShare: request.imageAuthGuardianShare, imageAuthInstitutional: request.imageAuthInstitutional, imageAuthSocialMedia: request.imageAuthSocialMedia, imageAuthAdvertising: request.imageAuthAdvertising, healthProfile: { create: { allergies: request.allergies, dietaryRestrictions: request.dietaryRestrictions, authorizedMedications: request.medications, importantInfo: [request.relevantConditions, request.specificNeeds, request.importantCareInfo].filter(Boolean).join("\n") || null } } } });
    await tx.guardianChild.upsert({ where: { guardianId_childId: { guardianId: request.guardianId, childId: child.id } }, update: {}, create: { guardianId: request.guardianId, childId: child.id, relationship: request.relationship, isPrimary: true, isFinancialResponsible: true, viewFinancial: true, authorizeMedication: true, authorizePickup: true } });
    if (!existingChild && request.authorizedPeople.length) await tx.authorizedPickupPerson.createMany({ data: request.authorizedPeople.map(p => ({ childId: child.id, authorizedByGuardianId: request.guardianId, name: p.name, cpf: p.cpf, phone: p.phone, relationship: p.relationship, notes: p.notes, photoUrl: p.photoUrl })) });
    await tx.contractAcceptance.upsert({ where: { childId_guardianId_versionId: { childId: child.id, guardianId: request.guardianId, versionId: contract.id } }, update: {}, create: { childId: child.id, guardianId: request.guardianId, versionId: contract.id } });
    await tx.consentAcceptance.upsert({ where: { guardianId_versionId: { guardianId: request.guardianId, versionId: consent.id } }, update: {}, create: { guardianId: request.guardianId, versionId: consent.id } });
    await tx.privacyPolicyAcceptance.upsert({ where: { guardianId_versionId: { guardianId: request.guardianId, versionId: privacy.id } }, update: {}, create: { guardianId: request.guardianId, versionId: privacy.id } });
    await tx.notification.create({ data: { guardianId: request.guardianId, childId: child.id, type: "ANNOUNCEMENT", title: "🎉 Matrícula aprovada!", body: `A matrícula de ${child.preferredName || child.fullName} foi aprovada. Conclua o contrato para acessar o Portal dos Pais.` } });
    await tx.enrollmentRequest.update({ where: { id }, data: { status: "APPROVED", approvedChildId: child.id, reviewedByUserId: admin.id, reviewedAt: new Date(), rejectionReason: null } });
    return { childId: child.id, guardianId: request.guardianId, alreadyApproved: false };
  }, { isolationLevel: "Serializable" });
  if (!result.alreadyApproved) await recordAuditLog({ actorUserId: admin.id, action: "MATRICULA_APROVADA", entity: "EnrollmentRequest", entityId: id, newData: { status: "APPROVED", childId: result.childId, guardianId: result.guardianId } });
  revalidatePath("/admin/matriculas"); revalidatePath(`/admin/matriculas/${id}`); revalidatePath("/admin/criancas"); revalidatePath("/matricula");
}

export async function rejectEnrollmentAction(formData: FormData) {
  const admin = await requireAdmin(); const id = String(formData.get("id") ?? ""); const reason = String(formData.get("reason") ?? "").trim();
  if (reason.length < 5) throw new Error("Informe um motivo claro para a rejeição.");
  const request = await prisma.enrollmentRequest.findUnique({ where: { id }, select: { status: true, guardianId: true, childFullName: true } });
  if (!request || !["SUBMITTED","UNDER_REVIEW"].includes(request.status)) throw new Error("Matrícula não encontrada ou já encerrada.");
  await prisma.$transaction([prisma.enrollmentRequest.update({ where: { id }, data: { status: "REJECTED", rejectionReason: reason, reviewedByUserId: admin.id, reviewedAt: new Date() } }), prisma.notification.create({ data: { guardianId: request.guardianId, type: "ANNOUNCEMENT", title: "Atualização da matrícula", body: `A matrícula de ${request.childFullName} não foi aprovada. Motivo: ${reason}` } })]);
  await recordAuditLog({ actorUserId: admin.id, action: "MATRICULA_REJEITADA", entity: "EnrollmentRequest", entityId: id, oldData: { status: request.status }, newData: { status: "REJECTED", reason } });
  revalidatePath("/admin/matriculas"); revalidatePath(`/admin/matriculas/${id}`); revalidatePath("/matricula");
}
