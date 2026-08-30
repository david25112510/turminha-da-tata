import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { readLocalStoredObject } from "@/lib/storage";

function contentType(key: string) { return key.endsWith(".png") ? "image/png" : key.endsWith(".webp") ? "image/webp" : key.endsWith(".gif") ? "image/gif" : "image/jpeg"; }
async function canRead(key: string, user: { id: string; role: string }) {
  const [area, ownerId, fileName] = key.split("/");
  if (!area || !ownerId || !fileName) return false;
  if (user.role === "ADMIN") return true;
  if (area === "caregivers") return user.role === "CAREGIVER" && ownerId === user.id;
  if (area === "children") {
    if (user.role === "CAREGIVER") return Boolean(await prisma.child.findFirst({ where: { id: ownerId, status: "ACTIVE", imageAuthInternal: true }, select: { id: true } }));
    if (user.role === "GUARDIAN") return Boolean(await prisma.guardianChild.findFirst({ where: { childId: ownerId, guardian: { userId: user.id }, viewPhotos: true, child: { imageAuthGuardianShare: true } }, select: { id: true } }));
  }
  if (["contracts", "consents", "privacy-policy"].includes(area) && user.role === "GUARDIAN") {
    const acceptanceId = fileName.replace(/\.[^.]+$/, "");
    const guardian = await prisma.guardian.findUnique({ where: { userId: user.id }, select: { id: true } });
    if (!guardian) return false;
    if (area === "contracts") return Boolean(await prisma.contractAcceptance.findFirst({ where: { id: acceptanceId, guardianId: guardian.id, status: "ACCEPTED" }, select: { id: true } }));
    if (area === "consents") return Boolean(await prisma.consentAcceptance.findFirst({ where: { id: acceptanceId, guardianId: guardian.id, status: "ACCEPTED" }, select: { id: true } }));
    return Boolean(await prisma.privacyPolicyAcceptance.findFirst({ where: { id: acceptanceId, guardianId: guardian.id, status: "ACCEPTED" }, select: { id: true } }));
  }
  return false;
}

export async function GET(_request: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const session = await auth();
  if (!session?.user?.id || !session.user.role) return new Response("Não autenticado", { status: 401 });
  const key = (await params).key.join("/");
  if (!(await canRead(key, session.user))) return new Response("Acesso negado", { status: 403 });
  try { const body = await readLocalStoredObject(key); return new Response(body, { headers: { "Content-Type": contentType(key), "Cache-Control": "private, no-store, max-age=0", "X-Content-Type-Options": "nosniff" } }); }
  catch { return new Response("Arquivo não encontrado", { status: 404 }); }
}
