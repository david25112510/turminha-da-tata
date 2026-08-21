"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { todayDateOnly } from "@/lib/date";

export async function checkInAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("Não autenticado.");

  const childId = String(formData.get("childId") ?? "");
  const personName = String(formData.get("personName") ?? "").trim();
  const personRelation = String(formData.get("personRelation") ?? "").trim();
  if (!childId || !personName) throw new Error("Criança e quem levou são obrigatórios.");

  const date = todayDateOnly();

  await prisma.attendance.upsert({
    where: { childId_date: { childId, date } },
    create: {
      childId,
      date,
      checkInTime: new Date(),
      checkInPersonName: personName,
      checkInPersonRelation: personRelation || null,
      checkInReceivedById: session.user.id,
    },
    update: {
      checkInTime: new Date(),
      checkInPersonName: personName,
      checkInPersonRelation: personRelation || null,
      checkInReceivedById: session.user.id,
    },
  });

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

  await prisma.attendance.upsert({
    where: { childId_date: { childId, date } },
    create: {
      childId,
      date,
      checkOutTime: new Date(),
      checkOutPersonName: personName,
      checkOutPersonRelation: personRelation || null,
      checkOutReceivedById: session.user.id,
    },
    update: {
      checkOutTime: new Date(),
      checkOutPersonName: personName,
      checkOutPersonRelation: personRelation || null,
      checkOutReceivedById: session.user.id,
    },
  });

  revalidatePath("/cuidadora");
}
