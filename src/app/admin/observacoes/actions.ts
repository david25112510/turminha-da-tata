"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authz";
import { recordAuditLog } from "@/lib/audit-log";
import type { ChildNoteStatus } from "@prisma/client";

const VALID_STATUSES: ChildNoteStatus[] = ["NEW", "READ", "ANSWERED", "ARCHIVED"];

export async function updateObservationStatusAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "") as ChildNoteStatus;
  if (!VALID_STATUSES.includes(status)) throw new Error("Status inválido.");

  const note = await prisma.childNote.findUnique({ where: { id } });
  if (!note || note.authorRole !== "GUARDIAN") throw new Error("Observação não encontrada.");

  await prisma.childNote.update({ where: { id }, data: { status } });

  await recordAuditLog({
    actorUserId: admin.id,
    action: "UPDATE",
    entity: "ChildNote",
    entityId: id,
    oldData: { status: note.status },
    newData: { status },
  });

  revalidatePath("/admin/observacoes");
}
