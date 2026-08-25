"use server";

import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { requireGuardian } from "@/lib/guardian";
import { recordAuditLog } from "@/lib/audit-log";
import { uploadFile } from "@/lib/storage";

const DATA_URL_PREFIX = "data:image/png;base64,";
// Mesmo raciocínio de src/app/pais/contrato/actions.ts: sanidade contra campo vazio/forjado, não
// análise de pixel — o gate real é o wizard no cliente.
const MIN_SIGNATURE_BASE64_LENGTH = 200;

export async function acceptConsentAction(formData: FormData) {
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
  const acceptance = await prisma.consentAcceptance.findFirst({
    where: { id: acceptanceId, guardianId: guardian.id },
    include: { version: true },
  });
  if (!acceptance) throw new Error("Termo de consentimento não encontrado.");
  // Idempotente de propósito: cobre duplo clique e a mesma pessoa com duas abas abertas.
  if (acceptance.status === "ACCEPTED") return;

  const buffer = Buffer.from(signatureDataUrl.slice(DATA_URL_PREFIX.length), "base64");
  const signatureUrl = await uploadFile(`consents/${acceptance.guardianId}/${acceptance.id}.png`, buffer, "image/png");

  const documentHash = createHash("sha256")
    .update(`${acceptance.versionId}:${acceptance.version.content}:${acceptance.guardianId}:${signatureUrl}`)
    .digest("hex");

  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || null;
  const userAgent = h.get("user-agent");
  const now = new Date();

  await prisma.consentAcceptance.update({
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
    action: "CONSENTIMENTO_LGPD_ACEITO",
    entity: "ConsentAcceptance",
    entityId: acceptance.id,
    newData: { versionId: acceptance.versionId },
  });

  // Sem revalidatePath de propósito — mesmo motivo de src/app/pais/contrato/actions.ts.
}
