import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { recordAuditLog } from "@/lib/audit-log";
import { DEFAULT_CONTRACT_CONTENT } from "@/lib/contract-template";

type Db = PrismaClient | Prisma.TransactionClient;

/**
 * Retorna a versão do contrato atualmente publicada, criando a 1.0 com o texto padrão na primeira
 * vez que for necessária (bootstrap preguiçoso — evita depender de um passo de seed separado).
 */
export async function getCurrentContractVersion(db: Db = prisma, actorUserId: string) {
  const current = await db.contractVersion.findFirst({
    where: { status: "PUBLISHED" },
    orderBy: { createdAt: "desc" },
  });
  if (current) return current;

  const version = await db.contractVersion.create({
    data: {
      version: "1.0",
      content: DEFAULT_CONTRACT_CONTENT,
      status: "PUBLISHED",
      createdById: actorUserId,
      publishedAt: new Date(),
    },
  });

  await recordAuditLog({
    actorUserId,
    action: "CONTRATO_CRIADO",
    entity: "ContractVersion",
    entityId: version.id,
    newData: { version: version.version },
  });

  return version;
}

/**
 * Garante que existe uma ContractAcceptance (pendente, se ainda não houver nenhuma) para o par
 * criança/responsável na versão atualmente publicada do contrato. Chamada sempre que um vínculo
 * guardian↔child é criado — hoje, só em createGuardianAction (src/app/admin/responsaveis/actions.ts).
 */
export async function ensureContractAcceptance(params: {
  childId: string;
  guardianId: string;
  actorUserId: string;
}) {
  const version = await getCurrentContractVersion(prisma, params.actorUserId);

  const existing = await prisma.contractAcceptance.findUnique({
    where: {
      childId_guardianId_versionId: {
        childId: params.childId,
        guardianId: params.guardianId,
        versionId: version.id,
      },
    },
  });
  if (existing) return existing;

  return prisma.contractAcceptance.create({
    data: {
      childId: params.childId,
      guardianId: params.guardianId,
      versionId: version.id,
      status: "PENDING",
    },
  });
}
