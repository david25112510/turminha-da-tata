"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authz";
import { recordAuditLog } from "@/lib/audit-log";
import { toggleUserActive } from "@/lib/user-actions";
import { uploadFile } from "@/lib/storage";
import { notifyAdmins } from "@/lib/notifications";

export type CreateCaregiverResult = { error: string } | { success: true; id: string; name: string };

/**
 * Não usa redirect() de propósito: chamar redirect() a partir de uma Server Action de uma página sob
 * /admin (coberta por src/proxy.ts) derruba a sessão nesta versão do Next.js (bug de framework, não desta
 * app — reproduzido isolado, sem nenhuma lógica além de um redirect() puro). Em vez disso, devolve um
 * resultado tipado e o cliente (nova/page.tsx) mostra sucesso com um link — navegação normal por <Link>,
 * que não passa por esse caminho quebrado.
 */
export async function createCaregiverAction(
  _prevState: CreateCaregiverResult | undefined,
  formData: FormData
): Promise<CreateCaregiverResult> {
  const admin = await requireAdmin();

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const phone = String(formData.get("phone") ?? "").trim();
  const cpf = String(formData.get("cpf") ?? "").trim();
  const birthDateRaw = String(formData.get("birthDate") ?? "");
  const notes = String(formData.get("notes") ?? "").trim();
  const tempPassword = String(formData.get("tempPassword") ?? "");

  if (!name || !email || !phone || !tempPassword) {
    return { error: "Nome, e-mail, telefone e senha inicial são obrigatórios." };
  }
  if (tempPassword.length < 8) {
    return { error: "A senha inicial deve ter pelo menos 8 caracteres." };
  }

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) return { error: "Já existe um usuário com este e-mail." };

  const passwordHash = await bcrypt.hash(tempPassword, 10);
  const caregiver = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role: "CAREGIVER",
      phone: phone || null,
      cpf: cpf || null,
      birthDate: birthDateRaw ? new Date(birthDateRaw) : null,
      notes: notes || null,
    },
  });

  await recordAuditLog({
    actorUserId: admin.id,
    action: "CREATE",
    entity: "User",
    entityId: caregiver.id,
    newData: { name, email, role: "CAREGIVER" },
  });

  await notifyAdmins(
    "CAREGIVER_CREATED",
    "Nova cuidadora cadastrada",
    `${name} foi cadastrada e já pode acessar o app.`,
    { entity: "User", entityId: caregiver.id }
  );

  revalidatePath("/admin/cuidadoras");
  return { success: true, id: caregiver.id, name: caregiver.name };
}

export async function updateCaregiverAction(formData: FormData) {
  const admin = await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const cpf = String(formData.get("cpf") ?? "").trim();
  const birthDateRaw = String(formData.get("birthDate") ?? "");
  const notes = String(formData.get("notes") ?? "").trim();

  if (!id || !name) throw new Error("Nome é obrigatório.");

  const caregiver = await prisma.user.findFirst({ where: { id, role: "CAREGIVER" } });
  if (!caregiver) throw new Error("Cuidadora não encontrada.");

  await prisma.user.update({
    where: { id },
    data: {
      name,
      phone: phone || null,
      cpf: cpf || null,
      birthDate: birthDateRaw ? new Date(birthDateRaw) : null,
      notes: notes || null,
    },
  });

  await recordAuditLog({
    actorUserId: admin.id,
    action: "UPDATE",
    entity: "User",
    entityId: id,
    oldData: { name: caregiver.name, phone: caregiver.phone },
    newData: { name, phone },
  });

  revalidatePath("/admin/cuidadoras");
  revalidatePath(`/admin/cuidadoras/${id}`);
}

export async function toggleCaregiverActiveAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");

  const caregiver = await prisma.user.findFirst({ where: { id, role: "CAREGIVER" } });
  if (!caregiver) throw new Error("Cuidadora não encontrada.");

  await toggleUserActive(id, admin.id);

  revalidatePath("/admin/cuidadoras");
  revalidatePath(`/admin/cuidadoras/${id}`);
}

/**
 * Exclusão permanente — remove só a conta. Cada registro de rotina que ela já fez (refeição, sono,
 * higiene, água, humor, atividade, medicamento administrado, foto, ocorrência) e cada AuditLog em
 * que ela é a autora **permanecem intactos** — é dado da criança e da trilha de auditoria, não da
 * cuidadora. Só perdem a referência de "quem fez" (SetNull, ver prisma/schema.prisma), igual a como
 * o GitHub trata comentários de uma conta apagada.
 */
export async function deleteCaregiverAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const confirmName = String(formData.get("confirmName") ?? "").trim();

  const caregiver = await prisma.user.findFirst({ where: { id, role: "CAREGIVER" } });
  if (!caregiver) throw new Error("Cuidadora não encontrada.");
  if (confirmName !== caregiver.name) throw new Error("O nome digitado não confere. Exclusão cancelada.");

  await recordAuditLog({
    actorUserId: admin.id,
    action: "DELETE",
    entity: "User",
    entityId: id,
    oldData: { name: caregiver.name, email: caregiver.email, role: caregiver.role },
  });

  await prisma.user.delete({ where: { id } });

  revalidatePath("/admin/cuidadoras");
}

const MAX_PHOTO_BYTES = 4 * 1024 * 1024;
const ALLOWED_PHOTO_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function uploadCaregiverPhotoAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const file = formData.get("photo");

  const caregiver = await prisma.user.findFirst({ where: { id, role: "CAREGIVER" } });
  if (!caregiver) throw new Error("Cuidadora não encontrada.");

  if (!(file instanceof File) || file.size === 0) throw new Error("Selecione um arquivo de imagem.");
  if (file.size > MAX_PHOTO_BYTES) throw new Error("Imagem maior que 4MB.");
  if (!ALLOWED_PHOTO_TYPES.has(file.type)) throw new Error("Formato de imagem não suportado.");

  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const fileName = `${Date.now()}-${randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const url = await uploadFile(`caregivers/${id}/${fileName}`, buffer, file.type);

  await prisma.user.update({ where: { id }, data: { photoUrl: url } });

  await recordAuditLog({
    actorUserId: admin.id,
    action: "UPDATE",
    entity: "User",
    entityId: id,
    newData: { photoUpdated: true },
  });

  revalidatePath(`/admin/cuidadoras/${id}`);
}
