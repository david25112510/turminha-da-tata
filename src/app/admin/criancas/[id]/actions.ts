"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdminChild } from "@/lib/authz";

export async function addAuthorizedPersonAction(formData: FormData) {
  const childId = String(formData.get("childId") ?? "");
  await requireAdminChild(childId);

  const name = String(formData.get("name") ?? "").trim();
  const cpf = String(formData.get("cpf") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const relationship = String(formData.get("relationship") ?? "OTHER");
  const notes = String(formData.get("notes") ?? "").trim();
  const authorizedByGuardianId = String(formData.get("authorizedByGuardianId") ?? "");

  if (!childId || !name || !phone || !authorizedByGuardianId) {
    throw new Error("Nome, telefone e responsável autorizador são obrigatórios.");
  }

  const guardianLink = await prisma.guardianChild.findUnique({
    where: { guardianId_childId: { guardianId: authorizedByGuardianId, childId } },
  });
  if (!guardianLink) throw new Error("O responsável autorizador não está vinculado a esta criança.");

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
  await requireAdminChild(childId);

  const person = await prisma.authorizedPickupPerson.findUnique({ where: { id } });
  if (!person || person.childId !== childId) throw new Error("Pessoa autorizada não encontrada para esta criança.");

  await prisma.authorizedPickupPerson.update({
    where: { id: person.id },
    data: { status: person.status === "ACTIVE" ? "INACTIVE" : "ACTIVE" },
  });

  revalidatePath(`/admin/criancas/${childId}`);
}
