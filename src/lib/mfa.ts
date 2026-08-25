import { prisma } from "@/lib/prisma";
import { verifyTotpCode } from "@/lib/totp";
import type { Role } from "@prisma/client";

/**
 * Decide se um login satisfaz a exigência de MFA — extraída de src/auth.ts para ser testável
 * isoladamente (importar auth.ts direto num teste constrói a instância inteira do NextAuth no
 * carregamento do módulo, o que não resolve bem sob o ambiente "node" do Vitest). MFA só existe
 * para role ADMIN, e só quando a própria conta tiver habilitado (User.totpEnabled).
 */
export async function checkMfaRequirement(userId: string, role: Role, totpCode: string | undefined): Promise<boolean> {
  if (role !== "ADMIN") return true;

  const account = await prisma.user.findUnique({
    where: { id: userId },
    select: { totpSecret: true, totpEnabled: true },
  });
  if (!account?.totpEnabled) return true;
  if (!account.totpSecret || !totpCode) return false;

  return verifyTotpCode(account.totpSecret, totpCode);
}
