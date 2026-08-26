"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { notifyGuardians, notifyAdmins } from "@/lib/notifications";
import { formatDuration, todayRange } from "@/lib/date";
import { MEAL_TYPE_LABELS, CONSUMPTION_LABELS, INCIDENT_TYPE_LABELS } from "@/lib/labels";
import { requireCaregiverChild } from "@/lib/authz";
import { recordAuditLog } from "@/lib/audit-log";

function revalidate(childId: string) {
  revalidatePath(`/cuidadora/criancas/${childId}`);
}

export async function addMealAction(formData: FormData) {
  const childId = String(formData.get("childId") ?? "");
  const { user } = await requireCaregiverChild(childId);
  const mealType = String(formData.get("mealType") ?? "OTHER");
  const consumption = String(formData.get("consumption") ?? "WELL");
  const notes = String(formData.get("notes") ?? "").trim();
  const meal = await prisma.mealRecord.create({ data: { childId, mealType: mealType as never, consumption: consumption as never, notes: notes || null, recordedById: user.id }, include: { child: true } });
  await recordAuditLog({ actorUserId: user.id, action: "ROUTINE_MEAL_CREATED", entity: "MealRecord", entityId: meal.id, newData: { childId, mealType, consumption, notes: notes || null } });
  await notifyGuardians(childId, "MEAL", "Alimentação", `${meal.child.preferredName || meal.child.fullName}: ${MEAL_TYPE_LABELS[mealType] ?? mealType} — ${CONSUMPTION_LABELS[consumption] ?? consumption}.`);
  revalidate(childId);
}

export async function startSleepAction(formData: FormData) {
  const childId = String(formData.get("childId") ?? "");
  const { user } = await requireCaregiverChild(childId);
  const { start, end } = todayRange();
  const openSleep = await prisma.sleepRecord.findFirst({ where: { childId, startTime: { gte: start, lt: end }, endTime: null } });
  if (openSleep) throw new Error("Já existe uma soneca em andamento para esta criança hoje.");
  const sleep = await prisma.sleepRecord.create({ data: { childId, startedById: user.id }, include: { child: true } });
  await recordAuditLog({ actorUserId: user.id, action: "ROUTINE_SLEEP_STARTED", entity: "SleepRecord", entityId: sleep.id, newData: { childId, startTime: sleep.startTime } });
  await notifyGuardians(childId, "SLEEP", "Soneca", `${sleep.child.preferredName || sleep.child.fullName} começou a dormir.`);
  revalidate(childId);
}

export async function endSleepAction(formData: FormData) {
  const childId = String(formData.get("childId") ?? "");
  const sleepId = String(formData.get("sleepId") ?? "");
  const { user } = await requireCaregiverChild(childId);
  const existing = await prisma.sleepRecord.findUnique({ where: { id: sleepId } });
  if (!existing || existing.childId !== childId) throw new Error("Registro de sono inválido.");
  if (existing.endTime) throw new Error("Este registro de sono já foi encerrado.");
  const sleep = await prisma.sleepRecord.update({ where: { id: sleepId }, data: { endTime: new Date(), endedById: user.id }, include: { child: true } });
  await recordAuditLog({ actorUserId: user.id, action: "ROUTINE_SLEEP_ENDED", entity: "SleepRecord", entityId: sleep.id, oldData: { endTime: existing.endTime }, newData: { endTime: sleep.endTime } });
  if (sleep.endTime) {
    const duration = formatDuration(sleep.startTime.getTime(), sleep.endTime.getTime());
    await notifyGuardians(childId, "SLEEP", "Soneca", `${sleep.child.preferredName || sleep.child.fullName} dormiu por ${duration}.`);
  }
  revalidate(childId);
}

export async function addHygieneAction(formData: FormData) {
  const childId = String(formData.get("childId") ?? "");
  const { user } = await requireCaregiverChild(childId);
  const type = String(formData.get("type") ?? "OTHER");
  const diaperType = String(formData.get("diaperType") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const record = await prisma.hygieneRecord.create({
    data: {
      childId,
      type: type as never,
      diaperType: type === "DIAPER_CHANGE" && diaperType ? (diaperType as never) : null,
      notes: notes || null,
      recordedById: user.id,
    },
  });
  await recordAuditLog({
    actorUserId: user.id,
    action: "ROUTINE_HYGIENE_CREATED",
    entity: "HygieneRecord",
    entityId: record.id,
    newData: { childId, type, diaperType: record.diaperType, notes: notes || null },
  });
  revalidate(childId);
}

export async function addWaterAction(formData: FormData) {
  const childId = String(formData.get("childId") ?? "");
  const { user } = await requireCaregiverChild(childId);
  const amount = String(formData.get("amount") ?? "MEDIUM");
  const notes = String(formData.get("notes") ?? "").trim();
  const record = await prisma.waterRecord.create({ data: { childId, amount: amount as never, notes: notes || null, recordedById: user.id } });
  await recordAuditLog({ actorUserId: user.id, action: "ROUTINE_WATER_CREATED", entity: "WaterRecord", entityId: record.id, newData: { childId, amount, notes: notes || null } });
  revalidate(childId);
}

export async function addMoodAction(formData: FormData) {
  const childId = String(formData.get("childId") ?? "");
  const { user } = await requireCaregiverChild(childId);
  const mood = String(formData.get("mood") ?? "NORMAL");
  const notes = String(formData.get("notes") ?? "").trim();
  const record = await prisma.moodRecord.create({ data: { childId, mood: mood as never, notes: notes || null, recordedById: user.id } });
  await recordAuditLog({ actorUserId: user.id, action: "ROUTINE_MOOD_CREATED", entity: "MoodRecord", entityId: record.id, newData: { childId, mood, notes: notes || null } });
  revalidate(childId);
}

export async function addHealthLogAction(formData: FormData) {
  const childId = String(formData.get("childId") ?? "");
  const { user } = await requireCaregiverChild(childId);
  const temperature = String(formData.get("temperature") ?? "").replace(",", ".");
  const symptoms = String(formData.get("symptoms") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const record = await prisma.healthLog.create({ data: { childId, temperature: temperature ? temperature : null, symptoms: symptoms || null, notes: notes || null, recordedById: user.id } });
  await recordAuditLog({ actorUserId: user.id, action: "ROUTINE_HEALTH_CREATED", entity: "HealthLog", entityId: record.id, newData: { childId, temperature: temperature || null, symptoms: symptoms || null, notes: notes || null } });
  revalidate(childId);
}

export async function addIncidentAction(formData: FormData) {
  const childId = String(formData.get("childId") ?? "");
  const { user } = await requireCaregiverChild(childId);
  const type = String(formData.get("type") ?? "OTHER");
  const description = String(formData.get("description") ?? "").trim();
  const actionsTaken = String(formData.get("actionsTaken") ?? "").trim();
  if (!description) throw new Error("Descrição é obrigatória.");
  const incident = await prisma.incident.create({ data: { childId, type: type as never, description, actionsTaken: actionsTaken || null, recordedById: user.id }, include: { child: true } });
  await recordAuditLog({ actorUserId: user.id, action: "ROUTINE_INCIDENT_CREATED", entity: "Incident", entityId: incident.id, newData: { childId, type, description, actionsTaken: actionsTaken || null } });
  await notifyGuardians(childId, "INCIDENT", "Nova informação importante", `Existe uma nova informação importante sobre ${incident.child.preferredName || incident.child.fullName}: ${INCIDENT_TYPE_LABELS[type] ?? type}.`);
  await notifyAdmins("INCIDENT", "Nova ocorrência registrada", `${incident.child.preferredName || incident.child.fullName}: ${INCIDENT_TYPE_LABELS[type] ?? type}.`, { entity: "Incident", entityId: incident.id });
  revalidate(childId);
}

export async function addMedicationAdministrationAction(formData: FormData) {
  const childId = String(formData.get("childId") ?? "");
  const { user } = await requireCaregiverChild(childId);
  const authorizationId = String(formData.get("authorizationId") ?? "");
  const notes = String(formData.get("notes") ?? "").trim();
  const authorization = await prisma.medicationAuthorization.findUnique({ where: { id: authorizationId } });
  if (!authorization || authorization.childId !== childId) throw new Error("Autorização de medicamento inválida.");
  const now = new Date();
  if (!authorization.active || authorization.status !== "ACTIVE" || authorization.validFrom > now || (authorization.validUntil && authorization.validUntil < now)) throw new Error("A autorização deste medicamento não está vigente.");
  const administration = await prisma.medicationAdministration.create({ data: { childId, authorizationId, administeredById: user.id, notes: notes || null }, include: { child: true } });
  await recordAuditLog({ actorUserId: user.id, action: "ROUTINE_MEDICATION_CREATED", entity: "MedicationAdministration", entityId: administration.id, newData: { childId, authorizationId, notes: notes || null } });
  await notifyGuardians(childId, "MEDICATION", "Medicamento administrado", `Há uma atualização sobre a medicação de ${administration.child.preferredName || administration.child.fullName}.`);
  await notifyAdmins("MEDICATION", "Medicamento administrado", `${administration.child.preferredName || administration.child.fullName}: ${authorization.medication}.`, { entity: "MedicationAdministration", entityId: administration.id });
  revalidate(childId);
}

export async function addActivityAction(formData: FormData) {
  const childId = String(formData.get("childId") ?? "");
  const { user } = await requireCaregiverChild(childId);
  const category = String(formData.get("category") ?? "OTHER");
  const description = String(formData.get("description") ?? "").trim();
  const activity = await prisma.activity.create({ data: { date: new Date(new Date().setHours(0, 0, 0, 0)), category: category as never, description: description || null, recordedById: user.id, children: { create: { childId } } } });
  await recordAuditLog({ actorUserId: user.id, action: "ROUTINE_ACTIVITY_CREATED", entity: "Activity", entityId: activity.id, newData: { childId, category, description: description || null } });
  revalidate(childId);
}

export async function addObservationAction(formData: FormData) {
  const childId = String(formData.get("childId") ?? "");
  const { user } = await requireCaregiverChild(childId);
  const text = String(formData.get("text") ?? "").trim();
  if (!text) throw new Error("Escreva a observação antes de registrar.");
  const note = await prisma.childNote.create({
    data: { childId, authorRole: "CAREGIVER", authorUserId: user.id, text },
  });
  await recordAuditLog({
    actorUserId: user.id,
    action: "ROUTINE_OBSERVATION_CREATED",
    entity: "ChildNote",
    entityId: note.id,
    newData: { childId, text },
  });
  await notifyGuardians(childId, "OBSERVATION", "Nova observação da escola", text, "viewRoutine");
  revalidate(childId);
}
