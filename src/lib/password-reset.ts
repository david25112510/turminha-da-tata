import { randomBytes, createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";

const TOKEN_TTL_MS = 60 * 60 * 1000;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

/** Creates a password reset token for a user and returns the raw token — never persisted, only its hash is. */
export async function createPasswordResetToken(userId: string): Promise<string> {
  const token = randomBytes(32).toString("hex");

  await prisma.passwordResetToken.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
    },
  });

  return token;
}

/** Validates and consumes a password reset token. Returns the associated userId, or null if invalid/expired/used. */
export async function consumePasswordResetToken(token: string): Promise<string | null> {
  if (!token) return null;

  const tokenHash = hashToken(token);
  const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });
  if (!record) return null;
  const now = new Date();

  // A condição faz do consumo uma operação atômica. Em duas requisições concorrentes somente uma
  // consegue trocar usedAt de null; a outra recebe count=0 e não pode redefinir a senha.
  const consumed = await prisma.passwordResetToken.updateMany({
    where: { id: record.id, tokenHash, usedAt: null, expiresAt: { gt: now } },
    data: { usedAt: now },
  });
  if (consumed.count !== 1) return null;

  return record.userId;
}
