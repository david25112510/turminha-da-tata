"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { notifyGuardians } from "@/lib/notifications";
import { formatDuration } from "@/lib/date";
import { MEAL_TYPE_LABELS, CONSUMPTION_LABELS, INCIDENT_TYPE_LABELS } from "@/lib/labels";

async function requireUserId() {
  const session = await auth();
  if (!session?.user) throw new Error("Não autenticado.");
  return session.user.id;
}

function revalidate(childId: string) {
  revalidatePath(`/cuidadora/criancas/${childId}`);
}

export async function addMealAction(formData: FormData) {
  const recordedById = await requireUserId();
  const childId = String(formData.get("childId") ?? "");
  const mealType = String(formData.get("mealType") ?? "OTHER");
  const consumption = String(formData.get("consumption") ?? "WELL");
  const notes = String(formData.get("notes") ?? "").trim();

  const meal = await prisma.mealRecord.create({
    data: {
      childId,
      mealType: mealType as never,
      consumption: consumption as never,
      notes: notes || null,
      recordedById,
    },
    include: { child: true },
  });

  await notifyGuardians(
    childId,
    "MEAL",
    "Alimentação",
    `${meal.child.preferredName || meal.child.fullName}: ${MEAL_TYPE_LABELS[mealType] ?? mealType} — ${CONSUMPTION_LABELS[consumption] ?? consumption}.`
  );

  revalidate(childId);
}

export async function startSleepAction(formData: FormData) {
  const startedById = await requireUserId();
  const childId = String(formData.get("childId") ?? "");

  await prisma.sleepRecord.create({
    data: { childId, startedById },
  });
  revalidate(childId);
}

export async function endSleepAction(formData: FormData) {
  const endedById = await requireUserId();
  const childId = String(formData.get("childId") ?? "");
  const sleepId = String(formData.get("sleepId") ?? "");

  const sleep = await prisma.sleepRecord.update({
    where: { id: sleepId },
    data: { endTime: new Date(), endedById },
    include: { child: true },
  });

  if (sleep.endTime) {
    const duration = formatDuration(sleep.startTime.getTime(), sleep.endTime.getTime());
    await notifyGuardians(
      childId,
      "SLEEP",
      "Soneca",
      `${sleep.child.preferredName || sleep.child.fullName} dormiu por ${duration}.`
    );
  }

  revalidate(childId);
}

export async function addHygieneAction(formData: FormData) {
  const recordedById = await requireUserId();
  const childId = String(formData.get("childId") ?? "");
  const type = String(formData.get("type") ?? "OTHER");
  const notes = String(formData.get("notes") ?? "").trim();

  await prisma.hygieneRecord.create({
    data: { childId, type: type as never, notes: notes || null, recordedById },
  });
  revalidate(childId);
}

export async function addMoodAction(formData: FormData) {
  const recordedById = await requireUserId();
  const childId = String(formData.get("childId") ?? "");
  const mood = String(formData.get("mood") ?? "NORMAL");
  const notes = String(formData.get("notes") ?? "").trim();

  await prisma.moodRecord.create({
    data: { childId, mood: mood as never, notes: notes || null, recordedById },
  });
  revalidate(childId);
}

export async function addHealthLogAction(formData: FormData) {
  const recordedById = await requireUserId();
  const childId = String(formData.get("childId") ?? "");
  const temperature = String(formData.get("temperature") ?? "").replace(",", ".");
  const symptoms = String(formData.get("symptoms") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  await prisma.healthLog.create({
    data: {
      childId,
      temperature: temperature ? temperature : null,
      symptoms: symptoms || null,
      notes: notes || null,
      recordedById,
    },
  });
  revalidate(childId);
}

export async function addIncidentAction(formData: FormData) {
  const recordedById = await requireUserId();
  const childId = String(formData.get("childId") ?? "");
  const type = String(formData.get("type") ?? "OTHER");
  const description = String(formData.get("description") ?? "").trim();
  const actionsTaken = String(formData.get("actionsTaken") ?? "").trim();
  if (!description) throw new Error("Descrição é obrigatória.");

  const incident = await prisma.incident.create({
    data: {
      childId,
      type: type as never,
      description,
      actionsTaken: actionsTaken || null,
      recordedById,
    },
    include: { child: true },
  });

  await notifyGuardians(
    childId,
    "INCIDENT",
    "Nova informação importante",
    `Existe uma nova informação importante sobre ${incident.child.preferredName || incident.child.fullName}: ${INCIDENT_TYPE_LABELS[type] ?? type}.`
  );

  revalidate(childId);
}

export async function addMedicationAdministrationAction(formData: FormData) {
  const administeredById = await requireUserId();
  const childId = String(formData.get("childId") ?? "");
  const authorizationId = String(formData.get("authorizationId") ?? "");
  const notes = String(formData.get("notes") ?? "").trim();

  await prisma.medicationAdministration.create({
    data: { childId, authorizationId, administeredById, notes: notes || null },
  });
  revalidate(childId);
}

export async function addActivityAction(formData: FormData) {
  const recordedById = await requireUserId();
  const childId = String(formData.get("childId") ?? "");
  const category = String(formData.get("category") ?? "OTHER");
  const description = String(formData.get("description") ?? "").trim();

  await prisma.activity.create({
    data: {
      date: new Date(new Date().setHours(0, 0, 0, 0)),
      category: category as never,
      description: description || null,
      recordedById,
      children: { create: { childId } },
    },
  });
  revalidate(childId);
}
