import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function requireGuardian() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const guardian = await prisma.guardian.findUnique({
    where: { userId: session.user.id },
    include: { children: { include: { child: true }, orderBy: { isPrimary: "desc" } } },
  });

  if (!guardian) redirect("/login");
  return guardian;
}

export { pickChildLink } from "./pick-child-link";
