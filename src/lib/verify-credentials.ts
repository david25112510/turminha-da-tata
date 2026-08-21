import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export type VerifiedUser = {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "CAREGIVER" | "GUARDIAN";
};

export async function verifyCredentials(
  email: string | undefined,
  password: string | undefined
): Promise<VerifiedUser | null> {
  if (!email || !password) return null;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.active) return null;

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return null;

  return { id: user.id, email: user.email, name: user.name, role: user.role };
}
