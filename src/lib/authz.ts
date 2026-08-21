import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

type Role = "ADMIN" | "CAREGIVER" | "GUARDIAN";

type SessionUser = {
  id: string;
  role: Role;
  email?: string | null;
  name?: string | null;
};

async function requireSession(): Promise<SessionUser> {
  const session = await auth();
  if (!session?.user?.id || !session.user.role) throw new Error("Não autenticado.");
  return session.user as SessionUser;
}

export async function requireRole(role: Role): Promise<SessionUser> {
  const user = await requireSession();
  if (user.role !== role) throw new Error("Você não tem permissão para realizar esta operação.");
  return user;
}

export const requireAdmin = () => requireRole("ADMIN");
export const requireCaregiver = () => requireRole("CAREGIVER");
export const requireGuardian = () => requireRole("GUARDIAN");

export async function requireActiveChild(childId: string) {
  if (!childId) throw new Error("Criança não informada.");
  const child = await prisma.child.findUnique({ where: { id: childId } });
  if (!child) throw new Error("Criança não encontrada.");
  if (child.status !== "ACTIVE") throw new Error("A criança está inativa.");
  return child;
}

export async function requireAdminChild(childId: string) {
  const user = await requireAdmin();
  const child = await requireActiveChild(childId);
  return { user, child };
}

export async function requireCaregiverChild(childId: string) {
  const user = await requireCaregiver();
  const child = await requireActiveChild(childId);
  return { user, child };
}

export async function requireAuthorizedPickupPerson(childId: string, personType: string, personId: string) {
  const { user, child } = await requireCaregiverChild(childId);
  if (!personId) throw new Error("Pessoa responsável não informada.");

  if (personType === "GUARDIAN") {
    const link = await prisma.guardianChild.findUnique({
      where: { guardianId_childId: { guardianId: personId, childId: child.id } },
      include: { guardian: true },
    });
    if (!link) throw new Error("O responsável não está vinculado a esta criança.");
    return { user, person: { id: link.guardian.id, name: link.guardian.name, relationship: link.relationship } };
  }

  if (personType === "AUTHORIZED") {
    const person = await prisma.authorizedPickupPerson.findFirst({
      where: { id: personId, childId: child.id, status: "ACTIVE" },
    });
    if (!person) throw new Error("Pessoa não autorizada para retirar esta criança.");
    return { user, person: { id: person.id, name: person.name, relationship: person.relationship } };
  }

  throw new Error("Tipo de pessoa responsável inválido.");
}

export async function requireGuardianChildPermission(
  childId: string,
  permission: "viewRoutine" | "viewPhotos" | "viewFinancial" | "authorizeMedication" | "authorizePickup"
) {
  const user = await requireGuardian();
  const guardian = await prisma.guardian.findUnique({ where: { userId: user.id } });
  if (!guardian) throw new Error("Responsável não encontrado.");
  const link = await prisma.guardianChild.findUnique({
    where: { guardianId_childId: { guardianId: guardian.id, childId } },
  });
  if (!link || !link[permission]) throw new Error("Você não tem permissão para acessar esta criança.");
  return { user, guardian, link };
}

export async function requireGuardianChild(childId: string) {
  const user = await requireGuardian();
  const guardian = await prisma.guardian.findUnique({ where: { userId: user.id } });
  if (!guardian) throw new Error("Responsável não encontrado.");
  const link = await prisma.guardianChild.findUnique({
    where: { guardianId_childId: { guardianId: guardian.id, childId } },
  });
  if (!link) throw new Error("Você não tem acesso a esta criança.");
  return { user, guardian, link };
}
