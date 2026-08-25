import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { recordAuditLog } from "@/lib/audit-log";
import { DEFAULT_CONSENT_CONTENT } from "@/lib/consent-template";

type Db = PrismaClient | Prisma.TransactionClient;

/**
 * Retorna a versão do termo LGPD atualmente publicada, criando a 1.0 com o texto padrão na
 * primeira vez que for necessária. Espelha getCurrentContractVersion (src/lib/contract.ts) —
 * mesmo padrão de bootstrap preguiçoso, modelo separado porque o consentimento é por guardian, não
 * por par criança/guardian.
 */
export async function getCurrentConsentVersion(db: Db = prisma, actorUserId: string) {
  const current = await db.consentVersion.findFirst({
    where: { status: "PUBLISHED" },
    orderBy: { createdAt: "desc" },
  });
  if (current) return current;

  const version = await db.consentVersion.create({
    data: {
      version: "1.0",
      content: DEFAULT_CONSENT_CONTENT,
      status: "PUBLISHED",
      createdById: actorUserId,
      publishedAt: new Date(),
    },
  });

  await recordAuditLog({
    actorUserId,
    action: "CONSENTIMENTO_LGPD_CRIADO",
    entity: "ConsentVersion",
    entityId: version.id,
    newData: { version: version.version },
  });

  return version;
}

/**
 * Garante uma ConsentAcceptance (pendente, se ainda não houver nenhuma) para o guardian na versão
 * atualmente publicada do termo LGPD. Chamada no mesmo ponto que ensureContractAcceptance —
 * createGuardianAction, logo após o vínculo GuardianChild ser criado.
 */
export async function ensureConsentAcceptance(params: { guardianId: string; actorUserId: string }) {
  const version = await getCurrentConsentVersion(prisma, params.actorUserId);

  const existing = await prisma.consentAcceptance.findUnique({
    where: { guardianId_versionId: { guardianId: params.guardianId, versionId: version.id } },
  });
  if (existing) return existing;

  return prisma.consentAcceptance.create({
    data: { guardianId: params.guardianId, versionId: version.id, status: "PENDING" },
  });
}
