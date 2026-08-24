"use server";

import bcrypt from "bcryptjs";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { recordAuditLog } from "@/lib/audit-log";

const MIN_PASSWORD_LENGTH = 8;

export type ChangePasswordResult = { error: string } | { success: true };

/**
 * Changes the password of the currently authenticated user (any role). Shared by /admin/configuracoes,
 * /cuidadora/perfil and /pais/perfil so the rules live in one place. NextAuth here uses stateless JWT
 * sessions — there's no server-side session store to invalidate on other devices after a change.
 */
export async function changePasswordAction(
  _prevState: ChangePasswordResult | undefined,
  formData: FormData
): Promise<ChangePasswordResult> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Não autenticado." };

  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!currentPassword || !newPassword || !confirmPassword) {
    return { error: "Preencha todos os campos." };
  }
  if (newPassword !== confirmPassword) {
    return { error: "A confirmação não coincide com a nova senha." };
  }
  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    return { error: `A nova senha deve ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.` };
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) return { error: "Usuário não encontrado." };

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) return { error: "Senha atual incorreta." };

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });

  await recordAuditLog({
    actorUserId: user.id,
    action: "UPDATE",
    entity: "User",
    entityId: user.id,
    newData: { passwordChanged: true },
  });

  return { success: true };
}
