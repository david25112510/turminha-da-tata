"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { notifyGuardians } from "@/lib/notifications";
import { requireActiveChild, requireAdmin, requireCaregiver } from "@/lib/authz";
import { auth } from "@/auth";
import { deleteStoredObject, uploadFile } from "@/lib/storage";
import { detectImageType, extensionFor } from "@/lib/file-validation";

const MAX_SIZE_BYTES = 8 * 1024 * 1024;

export async function uploadChildPhotoAction(formData: FormData) {
  const childId = String(formData.get("childId") ?? "");
  const caption = String(formData.get("caption") ?? "").trim();
  const file = formData.get("photo");
  const revalidateTo = String(formData.get("revalidateTo") ?? `/admin/criancas/${childId}`);

  const session = await auth();
  if (!session?.user?.id || !session.user.role) throw new Error("Não autenticado.");
  if (session.user.role === "ADMIN") await requireAdmin();
  else if (session.user.role === "CAREGIVER") await requireCaregiver();
  else throw new Error("Você não tem permissão para publicar fotos.");
  await requireActiveChild(childId);

  if (!(file instanceof File) || file.size === 0) throw new Error("Selecione um arquivo de imagem.");
  if (file.size > MAX_SIZE_BYTES) throw new Error("Imagem maior que 8MB.");

  // Nunca confia em file.type (só uma sugestão do cliente, forjável) — o tipo real vem dos
  // magic bytes do próprio arquivo. Ver src/lib/file-validation.ts.
  const buffer = Buffer.from(await file.arrayBuffer());
  const realType = detectImageType(buffer);
  if (!realType) throw new Error("Formato de imagem não suportado.");

  const child = await prisma.child.findUnique({ where: { id: childId } });
  if (!child) throw new Error("Criança não encontrada.");
  if (!child.imageAuthInternal) throw new Error("Esta criança não possui autorização de imagem.");

  const fileName = `${Date.now()}-${randomUUID()}.${extensionFor(realType)}`;
  const url = await uploadFile(`children/${childId}/${fileName}`, buffer, realType);

  try {
    await prisma.photo.create({ data: { childId, url, caption: caption || null, uploadedById: session.user.id } });
  } catch (error) {
    // Compensação: não deixa objeto órfão quando a persistência falha após o upload.
    await deleteStoredObject(url).catch(() => {});
    throw error;
  }

  await notifyGuardians(
    childId,
    "PHOTO",
    "Novo momento registrado",
    `Novos momentos de ${child.preferredName || child.fullName} foram publicados.`
  );

  revalidatePath(revalidateTo);
}
