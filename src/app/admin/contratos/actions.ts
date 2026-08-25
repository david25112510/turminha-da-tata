"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authz";
import { recordAuditLog } from "@/lib/audit-log";

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
