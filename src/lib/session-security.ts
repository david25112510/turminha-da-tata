import { prisma } from "@/lib/prisma";

type RevalidatableToken = {
  id?: unknown;
  role?: unknown;
  sub?: string;
  [key: string]: unknown;
};

/**
 * Revalida a autorização persistida no JWT contra o estado atual da conta.
 *
 * O token continua sendo usado como mecanismo de sessão do Auth.js, mas não é tratado como fonte
 * eterna de verdade para status/role. Assim, desativação, remoção ou mudança de papel passam a
 * valer na próxima leitura autenticada, sem esperar a expiração natural do JWT.
 */
export async function revalidateSessionToken<T extends RevalidatableToken>(token: T): Promise<T> {
  if (!token.id) return token;

  const currentUser = await prisma.user.findUnique({
    where: { id: String(token.id) },
    select: { id: true, role: true, active: true },
  });

  if (!currentUser?.active) {
    delete token.id;
    delete token.role;
    delete token.sub;
    return token;
  }

  token.role = currentUser.role;
  return token;
}
