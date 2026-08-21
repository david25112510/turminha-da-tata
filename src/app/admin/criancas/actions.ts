"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { WEEKDAYS } from "@/lib/labels";

export async function createChildAction(formData: FormData) {
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

  if (!fullName || !birthDate) {
    throw new Error("Nome completo e data de nascimento são obrigatórios.");
  }

  await prisma.child.create({
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

  redirect("/admin/criancas");
}
