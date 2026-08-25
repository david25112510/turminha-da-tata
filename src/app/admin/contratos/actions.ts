"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authz";
import { recordAuditLog } from "@/lib/audit-log";
import { isPushConfigured, sendPushToGuardian } from "@/lib/push";

function nextVersionLabel(current: string) {
  const major = parseInt(current, 10);
  return Number.isFinite(major) ? `${major + 1}.0` : "2.0";
}

/**
 * Publica uma nova versão do contrato: arquiva a atual, cria a nova, e gera pendência de aceite
 * para todo vínculo responsável↔criança ativo que ainda não aceitou essa versão. Nunca sobrescreve
 * ContractAcceptance já registrado — histórico de aceites de versões anteriores fica intacto.
 */
export async function publishNewVersionAction(formData: FormData) {
  const admin = await requireAdmin();
  const content = String(formData.get("content") ?? "").trim();
  if (!content) throw new Error("O texto do contrato não pode ficar vazio.");

  const current = await prisma.contractVersion.findFirst({
    where: { status: "PUBLISHED" },
    orderBy: { createdAt: "desc" },
  });

  const version = current ? nextVersionLabel(current.version) : "1.0";

  if (current) {
    await prisma.contractVersion.update({ where: { id: current.id }, data: { status: "ARCHIVED" } });
  }

  const newVersion = await prisma.contractVersion.create({
    data: { version, content, status: "PUBLISHED", createdById: admin.id, publishedAt: new Date() },
  });

  const activeLinks = await prisma.guardianChild.findMany({
    where: { child: { status: "ACTIVE" } },
    select: { childId: true, guardianId: true },
  });

  if (activeLinks.length > 0) {
    await prisma.contractAcceptance.createMany({
      data: activeLinks.map((link) => ({
        childId: link.childId,
        guardianId: link.guardianId,
        versionId: newVersion.id,
        status: "PENDING" as const,
      })),
      skipDuplicates: true,
    });
  }

  await recordAuditLog({
    actorUserId: admin.id,
    action: "CONTRATO_PUBLICADO",
    entity: "ContractVersion",
    entityId: newVersion.id,
    oldData: current ? { version: current.version } : undefined,
    newData: { version: newVersion.version, affectedLinks: activeLinks.length },
  });

  redirect("/admin/contratos");
}

/**
 * Lembrete para o responsável com ESTE contrato pendente — não usa notifyGuardians() de propósito:
 * aquele helper avisa todos os responsáveis vinculados à criança, mas aqui o alvo é só quem ainda
 * não aceitou (um irmão pode ter mais de um responsável, só um pode estar pendente).
 */
export async function resendPendingContractNotificationAction(formData: FormData) {
  const admin = await requireAdmin();
  const acceptanceId = String(formData.get("acceptanceId") ?? "");

  const acceptance = await prisma.contractAcceptance.findUnique({
    where: { id: acceptanceId },
    include: { child: true },
  });
  if (!acceptance) throw new Error("Contrato não encontrado.");
  if (acceptance.status !== "PENDING") throw new Error("Este contrato não está pendente.");

  const childName = acceptance.child.preferredName || acceptance.child.fullName;
  const title = "Contrato pendente";
  const body = `Existe um contrato aguardando sua confirmação no Portal dos Pais para ${childName}.`;

  await prisma.notification.create({
    data: { guardianId: acceptance.guardianId, childId: acceptance.childId, type: "ANNOUNCEMENT", title, body },
  });
  if (isPushConfigured()) {
    await sendPushToGuardian(acceptance.guardianId, { title, body, url: "/pais/contrato" });
  }

  await recordAuditLog({
    actorUserId: admin.id,
    action: "CONTRATO_LEMBRETE_ENVIADO",
    entity: "ContractAcceptance",
    entityId: acceptance.id,
  });

  revalidatePath(`/admin/contratos/${acceptance.id}`);
}
