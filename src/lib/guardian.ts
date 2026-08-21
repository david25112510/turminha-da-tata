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

export function pickChildLink(
  links: Awaited<ReturnType<typeof requireGuardian>>["children"],
  childId?: string
) {
  if (childId) {
    const found = links.find((l) => l.childId === childId);
    if (found) return found;
  }
  return links[0];
}
