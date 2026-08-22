"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { WEEKDAYS } from "@/lib/labels";
import { requireAdmin } from "@/lib/authz";
import { recordAuditLog } from "@/lib/audit-log";

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
