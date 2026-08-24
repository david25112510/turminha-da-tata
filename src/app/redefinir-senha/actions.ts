"use server";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { consumePasswordResetToken } from "@/lib/password-reset";
import { recordAuditLog } from "@/lib/audit-log";

const MIN_PASSWORD_LENGTH = 8;

export type ResetPasswordResult = { error: string } | { success: true };

export async function resetPasswordAction(
  _prevState: ResetPasswordResult | undefined,
  formData: FormData
): Promise<ResetPasswordResult> {
  const token = String(formData.get("token") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!token) return { error: "Link de recuperação inválido." };
  if (!newPassword || !confirmPassword) return { error: "Preencha todos os campos." };
  if (newPassword !== confirmPassword) return { error: "A confirmação não coincide com a nova senha." };
  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    return { error: `A nova senha deve ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.` };
  }

  const userId = await consumePasswordResetToken(token);
  if (!userId) return { error: "Este link expirou ou já foi usado. Solicite uma nova recuperação de senha." };

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });

  await recordAuditLog({
    actorUserId: userId,
    action: "UPDATE",
    entity: "User",
    entityId: userId,
    newData: { passwordReset: true },
  });

  return { success: true };
}
