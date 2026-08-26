"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireGuardianChild } from "@/lib/authz";
import { recordAuditLog } from "@/lib/audit-log";
import { notifyAdmins } from "@/lib/notifications";

/** Observação livre da família para a escola — sempre nasce NEW; a creche marca como lida/respondida. */
export async function sendObservationAction(formData: FormData) {
  const childId = String(formData.get("childId") ?? "");
  const text = String(formData.get("text") ?? "").trim();
  if (!text) throw new Error("Escreva a observação antes de enviar.");

  const { user, guardian } = await requireGuardianChild(childId);

  const note = await prisma.childNote.create({
    data: { childId, authorRole: "GUARDIAN", authorGuardianId: guardian.id, text, status: "NEW" },
    include: { child: true },
  });

  await recordAuditLog({
    actorUserId: user.id,
    action: "CREATE",
    entity: "ChildNote",
    entityId: note.id,
    newData: { childId, text },
  });

  await notifyAdmins(
    "OBSERVATION",
    "Nova observação de uma família",
    `${note.child.preferredName || note.child.fullName}: ${text}`,
    { entity: "ChildNote", entityId: note.id }
  );

  revalidatePath("/pais/observacoes");
}
