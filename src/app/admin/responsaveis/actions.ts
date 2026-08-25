"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authz";
import { recordAuditLog } from "@/lib/audit-log";
import { ensureContractAcceptance } from "@/lib/contract";
import { ensureConsentAcceptance } from "@/lib/consent";

export async function createGuardianAction(formData: FormData) {
  const admin = await requireAdmin();

  const name = String(formData.get("name") ?? "").trim();
  const cpf = String(formData.get("cpf") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const whatsapp = String(formData.get("whatsapp") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();

  const childId = String(formData.get("childId") ?? "");
  const relationship = String(formData.get("relationship") ?? "OTHER");
  const isFinancialResponsible = formData.get("isFinancialResponsible") === "on";
  const isPrimary = formData.get("isPrimary") === "on";

  const receiveNotifications = formData.get("receiveNotifications") === "on";
  const viewRoutine = formData.get("viewRoutine") === "on";
  const viewPhotos = formData.get("viewPhotos") === "on";
  const authorizeMedication = formData.get("authorizeMedication") === "on";
  const authorizePickup = formData.get("authorizePickup") === "on";
  const viewFinancial = formData.get("viewFinancial") === "on";
  const receiveCommunications = formData.get("receiveCommunications") === "on";

  const createPortalAccess = formData.get("createPortalAccess") === "on";
  const tempPassword = String(formData.get("tempPassword") ?? "");

  if (!name || !cpf || !phone || !childId) {
    throw new Error("Nome, CPF, telefone e criança vinculada são obrigatórios.");
  }

  const child = await prisma.child.findUnique({ where: { id: childId } });
  if (!child || child.status !== "ACTIVE") throw new Error("Criança não encontrada ou inativa.");

  let userId: string | undefined;

  if (createPortalAccess) {
    if (!email || !tempPassword) {
      throw new Error("E-mail e senha temporária são obrigatórios para criar acesso ao portal.");
    }
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) throw new Error("Já existe um usuário com este e-mail.");

    const passwordHash = await bcrypt.hash(tempPassword, 10);
    const user = await prisma.user.create({ data: { email, passwordHash, name, role: "GUARDIAN" } });
    userId = user.id;
  }

  const guardian = await prisma.guardian.create({
    data: { name, cpf, phone, whatsapp: whatsapp || null, email: email || null, address: address || null, userId },
  });

  await prisma.guardianChild.create({
    data: {
      guardianId: guardian.id,
      childId,
      relationship: relationship as never,
      isFinancialResponsible,
      isPrimary,
      receiveNotifications,
      viewRoutine,
      viewPhotos,
      authorizeMedication,
      authorizePickup,
      viewFinancial,
      receiveCommunications,
    },
  });

  await ensureContractAcceptance({ childId, guardianId: guardian.id, actorUserId: admin.id });
  await ensureConsentAcceptance({ guardianId: guardian.id, actorUserId: admin.id });

  await recordAuditLog({
    actorUserId: admin.id,
    action: "CREATE",
    entity: "Guardian",
    entityId: guardian.id,
    newData: {
      name,
      childId,
      relationship,
      isFinancialResponsible,
      isPrimary,
      viewFinancial,
      authorizePickup,
      authorizeMedication,
      portalAccessCreated: createPortalAccess,
    },
  });

  redirect("/admin/responsaveis");
}
