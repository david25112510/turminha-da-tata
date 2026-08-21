"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { todayDateOnly, formatTime } from "@/lib/date";
import { notifyGuardians } from "@/lib/notifications";

export async function checkInAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("Não autenticado.");

  const childId = String(formData.get("childId") ?? "");
  const personName = String(formData.get("personName") ?? "").trim();
  const personRelation = String(formData.get("personRelation") ?? "").trim();
  if (!childId || !personName) throw new Error("Criança e quem levou são obrigatórios.");

  const date = todayDateOnly();
  const now = new Date();

  const attendance = await prisma.attendance.upsert({
    where: { childId_date: { childId, date } },
    create: {
      childId,
      date,
      checkInTime: now,
      checkInPersonName: personName,
      checkInPersonRelation: personRelation || null,
      checkInReceivedById: session.user.id,
    },
    update: {
      checkInTime: now,
      checkInPersonName: personName,
      checkInPersonRelation: personRelation || null,
      checkInReceivedById: session.user.id,
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
  const session = await auth();
  if (!session?.user) throw new Error("Não autenticado.");

  const childId = String(formData.get("childId") ?? "");
  const personName = String(formData.get("personName") ?? "").trim();
  const personRelation = String(formData.get("personRelation") ?? "").trim();
  if (!childId || !personName) throw new Error("Criança e quem retirou são obrigatórios.");

  const date = todayDateOnly();
  const now = new Date();

  const attendance = await prisma.attendance.upsert({
    where: { childId_date: { childId, date } },
    create: {
      childId,
      date,
      checkOutTime: now,
      checkOutPersonName: personName,
      checkOutPersonRelation: personRelation || null,
      checkOutReceivedById: session.user.id,
    },
    update: {
      checkOutTime: now,
      checkOutPersonName: personName,
      checkOutPersonRelation: personRelation || null,
      checkOutReceivedById: session.user.id,
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
