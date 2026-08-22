"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdminChild } from "@/lib/authz";
import { recordAuditLog } from "@/lib/audit-log";

export async function addAuthorizedPersonAction(formData: FormData) {
  const childId = String(formData.get("childId") ?? "");
  const { user: admin } = await requireAdminChild(childId);

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

  const person = await prisma.authorizedPickupPerson.create({
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

  await recordAuditLog({
    actorUserId: admin.id,
    action: "CREATE",
    entity: "AuthorizedPickupPerson",
    entityId: person.id,
    newData: { childId, name, relationship, authorizedByGuardianId },
  });

  revalidatePath(`/admin/criancas/${childId}`);
}

export async function toggleAuthorizedPersonStatusAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const childId = String(formData.get("childId") ?? "");
  const { user: admin } = await requireAdminChild(childId);

  const person = await prisma.authorizedPickupPerson.findUnique({ where: { id } });
  if (!person || person.childId !== childId) throw new Error("Pessoa autorizada não encontrada para esta criança.");

  const newStatus = person.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
  await prisma.authorizedPickupPerson.update({
    where: { id: person.id },
    data: { status: newStatus },
  });

  await recordAuditLog({
    actorUserId: admin.id,
    action: "UPDATE",
    entity: "AuthorizedPickupPerson",
    entityId: person.id,
    oldData: { status: person.status },
    newData: { status: newStatus },
  });

  revalidatePath(`/admin/criancas/${childId}`);
}
