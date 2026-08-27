"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { WEEKDAYS } from "@/lib/labels";
import { requireAdmin } from "@/lib/authz";
import { recordAuditLog } from "@/lib/audit-log";
import { uploadFile } from "@/lib/storage";

export async function createChildAction(formData: FormData) {
  const admin = await requireAdmin();

  const fullName = String(formData.get("fullName") ?? "").trim();
  const preferredName = String(formData.get("preferredName") ?? "").trim();
  const birthDate = String(formData.get("birthDate") ?? "");
  const cpf = String(formData.get("cpf") ?? "").trim();
  const birthCertificate = String(formData.get("birthCertificate") ?? "").trim();
  const sex = String(formData.get("sex") ?? "FEMALE");
  const generalNotes = String(formData.get("generalNotes") ?? "").trim();

  const contractedEntryTime = String(formData.get("contractedEntryTime") ?? "07:30");
  const contractedExitTime = String(formData.get("contractedExitTime") ?? "17:30");
  const contractedDays = WEEKDAYS.filter((day) => formData.get(`day_${day}`) === "on");
  const toleranceMinutes = Number(formData.get("toleranceMinutes") ?? 15);
  const monthlyFee = String(formData.get("monthlyFee") ?? "0").replace(",", ".");
  const overtimeHourRate = String(formData.get("overtimeHourRate") ?? "0").replace(",", ".");
  const dueDay = Number(formData.get("dueDay") ?? 5);
  const imageAuthorized = formData.get("imageAuthorized") === "on";

  if (!fullName || !birthDate) throw new Error("Nome completo e data de nascimento são obrigatórios.");
  if (!Number.isInteger(toleranceMinutes) || toleranceMinutes < 0) throw new Error("Tolerância inválida.");
  if (!Number.isFinite(Number(monthlyFee)) || Number(monthlyFee) < 0) throw new Error("Mensalidade inválida.");
  if (!Number.isFinite(Number(overtimeHourRate)) || Number(overtimeHourRate) < 0) throw new Error("Valor da hora excedente inválido.");
  if (!Number.isInteger(dueDay) || dueDay < 1 || dueDay > 31) throw new Error("Dia de vencimento inválido.");

  const child = await prisma.child.create({
    data: {
      fullName,
      preferredName: preferredName || null,
      birthDate: new Date(birthDate),
      cpf: cpf || null,
      birthCertificate: birthCertificate || null,
      sex: sex as "FEMALE" | "MALE",
      generalNotes: generalNotes || null,
      contractedEntryTime,
      contractedExitTime,
      contractedDays,
      toleranceMinutes,
      monthlyFee,
      overtimeHourRate,
      dueDay,
      imageAuthorized,
    },
  });

  await recordAuditLog({
    actorUserId: admin.id,
    action: "CREATE",
    entity: "Child",
    entityId: child.id,
    newData: {
      fullName: child.fullName,
      monthlyFee,
      overtimeHourRate,
      contractedEntryTime,
      contractedExitTime,
      toleranceMinutes,
      dueDay,
    },
  });

  redirect("/admin/criancas");
}

/**
 * Edita os campos operacionais/contratuais de uma criança já cadastrada — identidade (nome
 * completo, CPF, certidão, sexo, data de nascimento) fica de fora de propósito, não muda depois do
 * cadastro por uma tela simples. Mesmas validações de createChildAction para os campos em comum.
 */
export async function updateChildAction(formData: FormData) {
  const admin = await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const child = await prisma.child.findUnique({ where: { id } });
  if (!child) throw new Error("Criança não encontrada.");

  const preferredName = String(formData.get("preferredName") ?? "").trim();
  const generalNotes = String(formData.get("generalNotes") ?? "").trim();
  const status = String(formData.get("status") ?? "ACTIVE") as "ACTIVE" | "INACTIVE";
  const contractedEntryTime = String(formData.get("contractedEntryTime") ?? "07:30");
  const contractedExitTime = String(formData.get("contractedExitTime") ?? "17:30");
  const contractedDays = WEEKDAYS.filter((day) => formData.get(`day_${day}`) === "on");
  const toleranceMinutes = Number(formData.get("toleranceMinutes") ?? 15);
  const monthlyFee = String(formData.get("monthlyFee") ?? "0").replace(",", ".");
  const overtimeHourRate = String(formData.get("overtimeHourRate") ?? "0").replace(",", ".");
  const dueDay = Number(formData.get("dueDay") ?? 5);
  const imageAuthorized = formData.get("imageAuthorized") === "on";

  if (!Number.isInteger(toleranceMinutes) || toleranceMinutes < 0) throw new Error("Tolerância inválida.");
  if (!Number.isFinite(Number(monthlyFee)) || Number(monthlyFee) < 0) throw new Error("Mensalidade inválida.");
  if (!Number.isFinite(Number(overtimeHourRate)) || Number(overtimeHourRate) < 0) throw new Error("Valor da hora excedente inválido.");
  if (!Number.isInteger(dueDay) || dueDay < 1 || dueDay > 31) throw new Error("Dia de vencimento inválido.");
  if (status !== "ACTIVE" && status !== "INACTIVE") throw new Error("Status inválido.");

  // inactivatedAt acompanha a transição de status — base para a política de retenção/anonimização
  // de dados (ver docs/lgpd.md). Volta a null se a criança for reativada.
  const inactivatedAt =
    status === "INACTIVE" && child.status === "ACTIVE"
      ? new Date()
      : status === "ACTIVE"
        ? null
        : child.inactivatedAt;

  await prisma.child.update({
    where: { id },
    data: {
      preferredName: preferredName || null,
      generalNotes: generalNotes || null,
      status,
      inactivatedAt,
      contractedEntryTime,
      contractedExitTime,
      contractedDays,
      toleranceMinutes,
      monthlyFee,
      overtimeHourRate,
      dueDay,
      imageAuthorized,
    },
  });

  await recordAuditLog({
    actorUserId: admin.id,
    action: "UPDATE",
    entity: "Child",
    entityId: id,
    oldData: {
      preferredName: child.preferredName,
      status: child.status,
      monthlyFee: child.monthlyFee.toString(),
      overtimeHourRate: child.overtimeHourRate.toString(),
      contractedEntryTime: child.contractedEntryTime,
      contractedExitTime: child.contractedExitTime,
      toleranceMinutes: child.toleranceMinutes,
      dueDay: child.dueDay,
      imageAuthorized: child.imageAuthorized,
    },
    newData: {
      preferredName,
      status,
      monthlyFee,
      overtimeHourRate,
      contractedEntryTime,
      contractedExitTime,
      toleranceMinutes,
      dueDay,
      imageAuthorized,
    },
  });

  revalidatePath("/admin/criancas");
  revalidatePath(`/admin/criancas/${id}`);
  redirect(`/admin/criancas/${id}`);
}

const MAX_PHOTO_BYTES = 4 * 1024 * 1024;
const ALLOWED_PHOTO_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

/** Foto de perfil da criança (Child.photoUrl) — distinta das fotos de rotina em src/lib/photo-actions.ts. */
export async function uploadChildProfilePhotoAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const file = formData.get("photo");

  const child = await prisma.child.findUnique({ where: { id } });
  if (!child) throw new Error("Criança não encontrada.");

  if (!(file instanceof File) || file.size === 0) throw new Error("Selecione um arquivo de imagem.");
  if (file.size > MAX_PHOTO_BYTES) throw new Error("Imagem maior que 4MB.");
  if (!ALLOWED_PHOTO_TYPES.has(file.type)) throw new Error("Formato de imagem não suportado.");

  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const fileName = `${Date.now()}-${randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const url = await uploadFile(`children/${id}/profile-${fileName}`, buffer, file.type);

  await prisma.child.update({ where: { id }, data: { photoUrl: url } });

  await recordAuditLog({
    actorUserId: admin.id,
    action: "UPDATE",
    entity: "Child",
    entityId: id,
    newData: { photoUpdated: true },
  });

  revalidatePath(`/admin/criancas/${id}`);
  revalidatePath(`/admin/criancas/${id}/editar`);
}

/**
 * Exclusão permanente — apaga a criança e, em cascata (ver prisma/schema.prisma), TODO o histórico
 * dela: presença, refeições, sono, higiene, água, humor, atividades, saúde, medicamentos (autorização
 * e administração), ocorrências, fotos, observações, vínculos com responsáveis, faturas e pagamentos,
 * aceites de contrato/consentimento. Decisão explícita do proprietário do sistema — sem retenção.
 */
export async function deleteChildAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const confirmName = String(formData.get("confirmName") ?? "").trim();

  const child = await prisma.child.findUnique({ where: { id } });
  if (!child) throw new Error("Criança não encontrada.");
  if (confirmName !== child.fullName) throw new Error("O nome digitado não confere. Exclusão cancelada.");

  await recordAuditLog({
    actorUserId: admin.id,
    action: "DELETE",
    entity: "Child",
    entityId: id,
    oldData: {
      fullName: child.fullName,
      preferredName: child.preferredName,
      birthDate: child.birthDate,
      status: child.status,
      monthlyFee: child.monthlyFee.toString(),
    },
  });

  await prisma.child.delete({ where: { id } });

  revalidatePath("/admin/criancas");
  redirect("/admin/criancas");
}
