"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { todayDateOnly, formatTime } from "@/lib/date";
import { notifyGuardians } from "@/lib/notifications";
import { requireAuthorizedPickupPerson, requireCaregiver, requireCaregiverChild } from "@/lib/authz";

export async function checkInAction(formData: FormData) {
  const childId = String(formData.get("childId") ?? "");
  const personType = String(formData.get("personType") ?? "");
  const personId = String(formData.get("personId") ?? "");
  const person = await requireAuthorizedPickupPerson(childId, personType, personId);
  const caregiver = await requireCaregiver();

  const date = todayDateOnly();
  const now = new Date();

  const attendance = await prisma.attendance.upsert({
    where: { childId_date: { childId, date } },
    create: {
      childId,
      date,
      checkInTime: now,
      checkInPersonName: person.name,
      checkInPersonRelation: person.relationship,
      checkInReceivedById: caregiver.id,
    },
    update: {
      checkInTime: now,
      checkInPersonName: person.name,
      checkInPersonRelation: person.relationship,
      checkInReceivedById: caregiver.id,
    },
    include: { child: true },
  });

  await notifyGuardians(
    childId,
    "ARRIVAL",
    "Chegada",
    `${attendance.child.preferredName || attendance.child.fullName} chegou à Turminha da Tata às ${formatTime(now)}.`
  );

  revalidatePath("/cuidadora");
}

export async function checkOutAction(formData: FormData) {
  const childId = String(formData.get("childId") ?? "");
  const personType = String(formData.get("personType") ?? "");
  const personId = String(formData.get("personId") ?? "");
  const person = await requireAuthorizedPickupPerson(childId, personType, personId);
  const caregiver = await requireCaregiver();

  const date = todayDateOnly();
  const now = new Date();
  await requireCaregiverChild(childId);
  const existing = await prisma.attendance.findUnique({ where: { childId_date: { childId, date } } });

  if (!existing?.checkInTime) {
    throw new Error("Não é possível registrar a saída antes da chegada da criança.");
  }
  if (existing.checkOutTime) {
    throw new Error("A saída desta criança já foi registrada hoje.");
  }

  const attendance = await prisma.attendance.update({
    where: { id: existing.id },
    data: {
      checkOutTime: now,
      checkOutPersonName: person.name,
      checkOutPersonRelation: person.relationship,
      checkOutReceivedById: caregiver.id,
    },
    include: { child: true },
  });

  await notifyGuardians(
    childId,
    "DEPARTURE",
    "Saída",
    `${attendance.child.preferredName || attendance.child.fullName} saiu da Turminha da Tata às ${formatTime(now)}.`
  );

  revalidatePath("/cuidadora");
}
