"use server";

import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { notifyGuardians } from "@/lib/notifications";

const MAX_SIZE_BYTES = 8 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function uploadChildPhotoAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("Não autenticado.");

  const childId = String(formData.get("childId") ?? "");
  const caption = String(formData.get("caption") ?? "").trim();
  const file = formData.get("photo");
  const revalidateTo = String(formData.get("revalidateTo") ?? `/admin/criancas/${childId}`);

  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Selecione um arquivo de imagem.");
  }
  if (file.size > MAX_SIZE_BYTES) throw new Error("Imagem maior que 8MB.");
  if (!ALLOWED_TYPES.has(file.type)) throw new Error("Formato de imagem não suportado.");

  const child = await prisma.child.findUnique({ where: { id: childId } });
  if (!child) throw new Error("Criança não encontrada.");
  if (!child.imageAuthorized) {
    throw new Error("Esta criança não possui autorização de imagem.");
  }

  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const fileName = `${Date.now()}-${randomUUID()}.${ext}`;
  const dir = path.join(process.cwd(), "public", "uploads", "children", childId);
  await mkdir(dir, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(dir, fileName), buffer);

  await prisma.photo.create({
    data: {
      childId,
      url: `/uploads/children/${childId}/${fileName}`,
      caption: caption || null,
      uploadedById: session.user.id,
    },
  });

  await notifyGuardians(
    childId,
    "PHOTO",
    "Novo momento registrado",
    `Novos momentos de ${child.preferredName || child.fullName} foram publicados.`
  );

  revalidatePath(revalidateTo);
}
