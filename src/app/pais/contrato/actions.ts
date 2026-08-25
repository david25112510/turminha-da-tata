"use server";

import { headers } from "next/headers";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { requireGuardian } from "@/lib/guardian";
import { recordAuditLog } from "@/lib/audit-log";

export async function acceptContractAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("Não autenticado.");
  const guardian = await requireGuardian();
  const acceptanceId = String(formData.get("acceptanceId") ?? "");
  const agreed = formData.get("agreed") === "on";

  if (!agreed) throw new Error("É preciso marcar que você leu e concorda com os termos.");

  // Nunca confia no ID vindo do form: a acceptance só é aceita se realmente pertencer a este guardian.
  const acceptance = await prisma.contractAcceptance.findFirst({
    where: { id: acceptanceId, guardianId: guardian.id },
  });
  if (!acceptance) throw new Error("Contrato não encontrado.");
  if (acceptance.status === "ACCEPTED") return;

  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || null;
  const userAgent = h.get("user-agent");

  await prisma.contractAcceptance.update({
    where: { id: acceptance.id },
    data: {
      status: "ACCEPTED",
      acceptedAt: new Date(),
      acceptedByUserId: session.user.id,
      ip,
      userAgent,
    },
  });

  await recordAuditLog({
    actorUserId: session.user.id,
    action: "CONTRATO_ACEITO",
    entity: "ContractAcceptance",
    entityId: acceptance.id,
    newData: { childId: acceptance.childId, versionId: acceptance.versionId },
  });

  // Sem revalidatePath de propósito: o cartão mostra a confirmação de aceite localmente (useActionState) e o
  // guardian segue para o portal por um clique próprio em "Continuar" — não por um re-fetch automático que
  // cortaria a mensagem de sucesso antes de ser lida.
}
