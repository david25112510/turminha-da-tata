"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authz";
import { recordAuditLog } from "@/lib/audit-log";
import { ensureContractAcceptance } from "@/lib/contract";
import { ensureConsentAcceptance } from "@/lib/consent";

async function findPendingRequestOrThrow(id: string) {
  const request = await prisma.signupRequest.findUnique({ where: { id }, include: { invite: true } });
  if (!request) throw new Error("Solicitação não encontrada.");
  if (request.status !== "PENDING") throw new Error("Esta solicitação já foi analisada.");
  return request;
}

/**
 * Aprova uma solicitação — só aqui uma conta (User) é criada de verdade. Para GUARDIAN, cria
 * também o Guardian, o vínculo GuardianChild (permissões básicas, iguais aos defaults do schema —
 * financeiro/medicamento/retirada ficam desligados até o admin ajustar manualmente) e os aceites
 * de contrato/consentimento pendentes, mesmo padrão de createGuardianAction
 * (src/app/admin/responsaveis/actions.ts).
 */
export async function approveSignupRequestAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const request = await findPendingRequestOrThrow(id);

  if (request.role === "CAREGIVER") {
    const caregiver = await prisma.user.create({
      data: {
        name: request.name,
        email: request.email,
        passwordHash: request.passwordHash,
        role: "CAREGIVER",
        phone: request.phone,
        cpf: request.cpf,
      },
    });

    await prisma.signupRequest.update({
      where: { id },
      data: { status: "APPROVED", reviewedByUserId: admin.id, reviewedAt: new Date() },
    });

    await recordAuditLog({
      actorUserId: admin.id,
      action: "APPROVE",
      entity: "SignupRequest",
      entityId: id,
      newData: { role: "CAREGIVER", createdUserId: caregiver.id, email: request.email },
    });

    revalidatePath("/admin/solicitacoes");
    revalidatePath("/admin/cuidadoras");
    return;
  }

  // role === "GUARDIAN"
  if (!request.invite) throw new Error("Convite associado a esta solicitação não foi encontrado.");

  const guardianUser = await prisma.user.create({
    data: {
      name: request.name,
      email: request.email,
      passwordHash: request.passwordHash,
      role: "GUARDIAN",
      phone: request.phone,
      cpf: request.cpf,
    },
  });

  const guardian = await prisma.guardian.create({
    data: {
      userId: guardianUser.id,
      name: request.name,
      cpf: request.cpf ?? "",
      phone: request.phone ?? "",
      email: request.email,
    },
  });

  await prisma.guardianChild.create({
    data: {
      guardianId: guardian.id,
      childId: request.invite.childId,
      relationship: request.relationship ?? "OTHER",
    },
  });

  await ensureContractAcceptance({ childId: request.invite.childId, guardianId: guardian.id, actorUserId: admin.id });
  await ensureConsentAcceptance({ guardianId: guardian.id, actorUserId: admin.id });

  await prisma.signupRequest.update({
    where: { id },
    data: { status: "APPROVED", reviewedByUserId: admin.id, reviewedAt: new Date() },
  });

  await recordAuditLog({
    actorUserId: admin.id,
    action: "APPROVE",
    entity: "SignupRequest",
    entityId: id,
    newData: { role: "GUARDIAN", createdUserId: guardianUser.id, guardianId: guardian.id, childId: request.invite.childId },
  });

  revalidatePath("/admin/solicitacoes");
  revalidatePath("/admin/responsaveis");
}

export async function rejectSignupRequestAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  if (!reason) throw new Error("Informe o motivo da recusa.");

  const request = await findPendingRequestOrThrow(id);

  await prisma.signupRequest.update({
    where: { id },
    data: { status: "REJECTED", reviewedByUserId: admin.id, reviewedAt: new Date(), reviewNotes: reason },
  });

  await recordAuditLog({
    actorUserId: admin.id,
    action: "REJECT",
    entity: "SignupRequest",
    entityId: id,
    oldData: { status: request.status },
    newData: { status: "REJECTED", reason },
  });

  revalidatePath("/admin/solicitacoes");
}
