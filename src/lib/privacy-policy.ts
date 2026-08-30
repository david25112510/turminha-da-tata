import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { recordAuditLog } from "@/lib/audit-log";
import { DEFAULT_PRIVACY_POLICY_CONTENT } from "@/lib/privacy-policy-template";

type Db = PrismaClient | Prisma.TransactionClient;

/**
 * Retorna a versão da Política de Privacidade atualmente publicada, criando a 1.0 com o texto
 * padrão na primeira vez que for necessária. Espelha getCurrentConsentVersion (src/lib/consent.ts)
 * — mesmo padrão de bootstrap preguiçoso, modelo separado porque é um documento distinto do
 * Consentimento LGPD.
 */
export async function getCurrentPrivacyPolicyVersion(db: Db = prisma, actorUserId: string) {
  const current = await db.privacyPolicyVersion.findFirst({
    where: { status: "PUBLISHED" },
    orderBy: { createdAt: "desc" },
  });
  if (current) return current;

  const version = await db.privacyPolicyVersion.create({
    data: {
      version: "1.0",
      content: DEFAULT_PRIVACY_POLICY_CONTENT,
      status: "PUBLISHED",
      createdById: actorUserId,
      publishedAt: new Date(),
    },
  });

  await recordAuditLog({
    actorUserId,
    action: "POLITICA_PRIVACIDADE_CRIADA",
    entity: "PrivacyPolicyVersion",
    entityId: version.id,
    newData: { version: version.version },
  });

  return version;
}

/**
 * Garante uma PrivacyPolicyAcceptance (pendente, se ainda não houver nenhuma) para o guardian na
 * versão atualmente publicada. Chamada no mesmo ponto que ensureContractAcceptance/
 * ensureConsentAcceptance — createGuardianAction e approveSignupRequestAction, logo após o vínculo
 * GuardianChild ser criado.
 */
export async function ensurePrivacyPolicyAcceptance(params: { guardianId: string; actorUserId: string }) {
  const version = await getCurrentPrivacyPolicyVersion(prisma, params.actorUserId);

  const existing = await prisma.privacyPolicyAcceptance.findUnique({
    where: { guardianId_versionId: { guardianId: params.guardianId, versionId: version.id } },
  });
  if (existing) return existing;

  return prisma.privacyPolicyAcceptance.create({
    data: { guardianId: params.guardianId, versionId: version.id, status: "PENDING" },
  });
}
