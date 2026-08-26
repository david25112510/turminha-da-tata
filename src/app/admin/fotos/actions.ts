"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authz";
import { recordAuditLog } from "@/lib/audit-log";

/**
 * Remove uma foto do mural — nunca silenciosamente: exige motivo e grava o registro completo
 * (quem removeu, quando, a foto e a criança) em AuditLog antes de apagar. Remove só o registro do
 * banco (Photo), não o objeto no storage — consistente com src/lib/storage.ts não expor delete hoje.
 */
export async function removePhotoAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  if (!reason) throw new Error("Informe o motivo da remoção.");

  const photo = await prisma.photo.findUnique({ where: { id }, include: { child: true } });
  if (!photo) throw new Error("Foto não encontrada.");

  await recordAuditLog({
    actorUserId: admin.id,
    action: "DELETE",
    entity: "Photo",
    entityId: id,
    oldData: {
      childId: photo.childId,
      childName: photo.child.preferredName || photo.child.fullName,
      url: photo.url,
      caption: photo.caption,
      takenAt: photo.takenAt,
    },
    newData: { reason },
  });

  await prisma.photo.delete({ where: { id } });

  revalidatePath("/admin/fotos");
}
