"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export async function addAuthorizedPersonAction(formData: FormData) {
  const childId = String(formData.get("childId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const cpf = String(formData.get("cpf") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const relationship = String(formData.get("relationship") ?? "OTHER");
  const notes = String(formData.get("notes") ?? "").trim();
  const authorizedByGuardianId = String(formData.get("authorizedByGuardianId") ?? "");

  if (!childId || !name || !phone || !authorizedByGuardianId) {
    throw new Error("Nome, telefone e responsável autorizador são obrigatórios.");
  }

  await prisma.authorizedPickupPerson.create({
    data: {
      childId,
      name,
      cpf: cpf || null,
      phone,
      relationship: relationship as never,
      notes: notes || null,
      authorizedByGuardianId,
    },
  });

  revalidatePath(`/admin/criancas/${childId}`);
}

export async function toggleAuthorizedPersonStatusAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const childId = String(formData.get("childId") ?? "");
  const currentStatus = String(formData.get("currentStatus") ?? "ACTIVE");

  await prisma.authorizedPickupPerson.update({
    where: { id },
    data: { status: currentStatus === "ACTIVE" ? "INACTIVE" : "ACTIVE" },
  });

  revalidatePath(`/admin/criancas/${childId}`);
}
