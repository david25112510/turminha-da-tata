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

  const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!record) return null;
  if (record.usedAt) return null;
  if (record.expiresAt < new Date()) return null;

  await prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } });

  return record.userId;
}
