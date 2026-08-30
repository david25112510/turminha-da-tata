"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const CAREGIVER_EDIT_WINDOW_MS = 24 * 60 * 60 * 1000;
const ALLOWED = new Set(["AttendanceCheckIn", "AttendanceCheckOut", "MealRecord", "SleepRecord", "HygieneRecord", "WaterRecord", "MoodRecord", "HealthLog", "Activity", "ChildNote"]);
function parseSaoPauloDate(value: string) { const date = new Date(`${value}:00-03:00`); if (Number.isNaN(date.getTime())) throw new Error("Novo horário inválido."); if (date.getTime() > Date.now() + 5 * 60 * 1000) throw new Error("O horário não pode estar no futuro."); return date; }

export async function correctRoutineRecordAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id || !["ADMIN", "CAREGIVER"].includes(session.user.role)) throw new Error("Sem permissão para corrigir este registro.");
  const id = String(formData.get("id") ?? ""), childId = String(formData.get("childId") ?? ""), entity = String(formData.get("entity") ?? ""), reason = String(formData.get("reason") ?? "").trim();
  if (!id || !childId || !ALLOWED.has(entity)) throw new Error("Registro inválido.");
  if (reason.length < 8) throw new Error("Informe um motivo com pelo menos 8 caracteres.");
  const newTime = parseSaoPauloDate(String(formData.get("newTime") ?? ""));
  let record: { id: string; childId: string; time: Date | null } | null = null;
  if (entity === "AttendanceCheckIn" || entity === "AttendanceCheckOut") { const row = await prisma.attendance.findUnique({ where: { id } }); record = row ? { id: row.id, childId: row.childId, time: entity === "AttendanceCheckIn" ? row.checkInTime : row.checkOutTime } : null; }
  else if (entity === "MealRecord") record = await prisma.mealRecord.findUnique({ where: { id }, select: { id: true, childId: true, time: true } });
  else if (entity === "SleepRecord") { const row = await prisma.sleepRecord.findUnique({ where: { id }, select: { id: true, childId: true, startTime: true } }); record = row && { id: row.id, childId: row.childId, time: row.startTime }; }
  else if (entity === "HygieneRecord") record = await prisma.hygieneRecord.findUnique({ where: { id }, select: { id: true, childId: true, time: true } });
  else if (entity === "WaterRecord") record = await prisma.waterRecord.findUnique({ where: { id }, select: { id: true, childId: true, time: true } });
  else if (entity === "MoodRecord") record = await prisma.moodRecord.findUnique({ where: { id }, select: { id: true, childId: true, time: true } });
  else if (entity === "HealthLog") record = await prisma.healthLog.findUnique({ where: { id }, select: { id: true, childId: true, time: true } });
  else if (entity === "Activity") { const row = await prisma.activity.findUnique({ where: { id }, select: { id: true, time: true, children: { select: { childId: true } } } }); record = row && row.children.some((child) => child.childId === childId) ? { id: row.id, childId, time: row.time } : null; }
  else if (entity === "ChildNote") record = await prisma.childNote.findUnique({ where: { id }, select: { id: true, childId: true, time: true } });
  if (!record || record.childId !== childId || !record.time) throw new Error("Registro não encontrado para esta criança.");
  const child = await prisma.child.findUnique({ where: { id: childId }, select: { status: true } });
  if (!child || child.status !== "ACTIVE") throw new Error("A criança está inativa ou não existe.");
  if (session.user.role === "CAREGIVER" && Date.now() - record.time.getTime() > CAREGIVER_EDIT_WINDOW_MS) throw new Error("O período de correção da cuidadora é de 24 horas. Solicite ao administrador.");
  const h = await headers();
  const audit = { actorUserId: session.user.id, action: "CORRECTION", entity, entityId: id, oldData: { childId, time: record.time.toISOString() }, newData: { childId, time: newTime.toISOString(), reason, performedByRole: session.user.role }, ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip"), userAgent: h.get("user-agent") };
  await prisma.$transaction(async (tx) => {
    if (entity === "AttendanceCheckIn") await tx.attendance.update({ where: { id }, data: { checkInTime: newTime } });
    else if (entity === "AttendanceCheckOut") await tx.attendance.update({ where: { id }, data: { checkOutTime: newTime } });
    else if (entity === "MealRecord") await tx.mealRecord.update({ where: { id }, data: { time: newTime } });
    else if (entity === "SleepRecord") await tx.sleepRecord.update({ where: { id }, data: { startTime: newTime } });
    else if (entity === "HygieneRecord") await tx.hygieneRecord.update({ where: { id }, data: { time: newTime } });
    else if (entity === "WaterRecord") await tx.waterRecord.update({ where: { id }, data: { time: newTime } });
    else if (entity === "MoodRecord") await tx.moodRecord.update({ where: { id }, data: { time: newTime } });
    else if (entity === "HealthLog") await tx.healthLog.update({ where: { id }, data: { time: newTime } });
    else if (entity === "Activity") await tx.activity.update({ where: { id }, data: { time: newTime } });
    else await tx.childNote.update({ where: { id }, data: { time: newTime } });
    await tx.auditLog.create({ data: audit });
  });
  revalidatePath(`/cuidadora/criancas/${childId}`); revalidatePath(`/admin/criancas/${childId}`); revalidatePath("/admin/rotina");
}
