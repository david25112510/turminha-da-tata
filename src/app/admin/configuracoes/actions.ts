"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { requireAdmin } from "@/lib/authz";
import { toggleUserActive } from "@/lib/user-actions";
import { prisma } from "@/lib/prisma";
import { recordAuditLog } from "@/lib/audit-log";
import { generateTotpSecret, totpUri, verifyTotpCode } from "@/lib/totp";

export async function toggleUserActiveAction(formData: FormData) {
  const session = await requireAdmin();
  const userId = String(formData.get("userId") ?? "");

  await toggleUserActive(userId, session.id);

  revalidatePath("/admin/configuracoes");
  revalidatePath("/admin/cuidadoras");
}

export type TotpSetupState = { secret: string; uri: string } | { error: string } | undefined;

/** Gera um novo segredo TOTP — não grava nada ainda, só depois da confirmação em confirmTotpEnrollmentAction. */
export async function generateTotpSetupAction(): Promise<TotpSetupState> {
  const admin = await requireAdmin();
  const user = await prisma.user.findUnique({ where: { id: admin.id }, select: { email: true } });
  if (!user) return { error: "Usuário não encontrado." };

  const secret = generateTotpSecret();
  return { secret, uri: totpUri(secret, user.email) };
}

export type ConfirmTotpState = { success: true } | { error: string } | undefined;

/** Confirma o código do app autenticador e só então grava o segredo — ativa o MFA atomicamente. */
export async function confirmTotpEnrollmentAction(_prevState: ConfirmTotpState, formData: FormData): Promise<ConfirmTotpState> {
  const admin = await requireAdmin();
  const secret = String(formData.get("secret") ?? "");
  const code = String(formData.get("code") ?? "").trim();

  if (!secret || !code) return { error: "Preencha o código de confirmação." };
  if (!verifyTotpCode(secret, code)) {
    return { error: "Código inválido. Confira o horário do seu celular e tente novamente." };
  }

  await prisma.user.update({ where: { id: admin.id }, data: { totpSecret: secret, totpEnabled: true } });

  await recordAuditLog({
    actorUserId: admin.id,
    action: "UPDATE",
    entity: "User",
    entityId: admin.id,
    newData: { totpEnabled: true },
  });

  revalidatePath("/admin/configuracoes");
  return { success: true };
}

export type DisableTotpState = { success: true } | { error: string } | undefined;

/** Desativa o MFA — exige a senha atual (re-autenticação), mesmo padrão de mudar a própria senha. */
export async function disableTotpAction(_prevState: DisableTotpState, formData: FormData): Promise<DisableTotpState> {
  const admin = await requireAdmin();
  const currentPassword = String(formData.get("currentPassword") ?? "");
  if (!currentPassword) return { error: "Informe sua senha atual." };

  const user = await prisma.user.findUnique({ where: { id: admin.id } });
  if (!user) return { error: "Usuário não encontrado." };

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) return { error: "Senha atual incorreta." };

  await prisma.user.update({ where: { id: admin.id }, data: { totpSecret: null, totpEnabled: false } });

  await recordAuditLog({
    actorUserId: admin.id,
    action: "UPDATE",
    entity: "User",
    entityId: admin.id,
    newData: { totpEnabled: false },
  });

  revalidatePath("/admin/configuracoes");
  return { success: true };
}
