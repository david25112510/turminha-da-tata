"use server";

import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { requireGuardian } from "@/lib/guardian";
import { recordAuditLog } from "@/lib/audit-log";
import { uploadFile } from "@/lib/storage";

const DATA_URL_PREFIX = "data:image/png;base64,";
// Sanidade contra um campo vazio/forjado — não é análise de pixel (desproporcional para o que se
// precisa aqui); o gate real de "não deixar assinar em branco" é o wizard no cliente, que só chega
// ao envio final depois de um traço de verdade no canvas.
const MIN_SIGNATURE_BASE64_LENGTH = 200;

export async function acceptContractAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("Não autenticado.");
  const guardian = await requireGuardian();
  const acceptanceId = String(formData.get("acceptanceId") ?? "");
  const agreed = formData.get("agreed") === "on";
  const signatureDataUrl = String(formData.get("signature") ?? "");

  if (!agreed) throw new Error("É preciso marcar que você leu e concorda com os termos.");
  if (!signatureDataUrl.startsWith(DATA_URL_PREFIX) || signatureDataUrl.length - DATA_URL_PREFIX.length < MIN_SIGNATURE_BASE64_LENGTH) {
    throw new Error("Por favor, realize sua assinatura antes de continuar.");
  }

  // Nunca confia no ID vindo do form: a acceptance só é aceita se realmente pertencer a este guardian.
  const acceptance = await prisma.contractAcceptance.findFirst({
    where: { id: acceptanceId, guardianId: guardian.id },
    include: { version: true },
  });
  if (!acceptance) throw new Error("Contrato não encontrado.");
  // Idempotente de propósito: cobre duplo clique e a mesma pessoa com duas abas abertas — a segunda
  // chamada encontra o status já ACCEPTED e apenas retorna, sem gerar um segundo aceite/assinatura.
  if (acceptance.status === "ACCEPTED") return;

  const buffer = Buffer.from(signatureDataUrl.slice(DATA_URL_PREFIX.length), "base64");
  const signatureUrl = await uploadFile(`contracts/${acceptance.childId}/${acceptance.id}.png`, buffer, "image/png");

  const documentHash = createHash("sha256")
    .update(`${acceptance.versionId}:${acceptance.version.content}:${acceptance.childId}:${acceptance.guardianId}:${signatureUrl}`)
    .digest("hex");

  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || null;
  const userAgent = h.get("user-agent");
  const now = new Date();

  await prisma.contractAcceptance.update({
    where: { id: acceptance.id },
    data: {
      status: "ACCEPTED",
      acceptedAt: now,
      acceptedByUserId: session.user.id,
      signatureUrl,
      signedAt: now,
      documentHash,
      ip,
      userAgent,
    },
  });

  await recordAuditLog({
    actorUserId: session.user.id,
    action: "CONTRATO_ASSINADO",
    entity: "ContractAcceptance",
    entityId: acceptance.id,
    newData: { childId: acceptance.childId, versionId: acceptance.versionId },
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
