import "dotenv/config";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { prisma } from "../src/lib/prisma";
import { detectImageType, extensionFor } from "../src/lib/file-validation";
import { deleteStoredObject, uploadFile } from "../src/lib/storage";

const apply = process.argv.includes("--apply");
const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
const limit = limitArg ? Number(limitArg.split("=")[1]) : 100;
if (!Number.isInteger(limit) || limit < 1 || limit > 1_000) throw new Error("--limit deve estar entre 1 e 1000.");

async function loadLegacy(url: string): Promise<Buffer> {
  if (url.startsWith("/uploads/")) {
    const relative = url.slice("/uploads/".length);
    if (!relative || relative.includes("..") || relative.includes("\\") || relative.includes("\0")) throw new Error("Caminho legado inválido.");
    return readFile(path.join(process.cwd(), "public", "uploads", ...relative.split("/")));
  }
  if (url.startsWith("http://") || url.startsWith("https://")) {
    const response = await fetch(url, { signal: AbortSignal.timeout(15_000) });
    if (!response.ok) throw new Error(`Origem respondeu ${response.status}.`);
    const declaredLength = Number(response.headers.get("content-length") ?? 0);
    if (declaredLength > 8 * 1024 * 1024) throw new Error("Arquivo excede 8 MiB.");
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length > 8 * 1024 * 1024) throw new Error("Arquivo excede 8 MiB.");
    return buffer;
  }
  throw new Error("Tipo de origem não suportado.");
}

async function main() {
try {
  const photos = await prisma.photo.findMany({
    where: { NOT: { url: { startsWith: "storage://" } } },
    select: { id: true, childId: true, url: true },
    orderBy: { id: "asc" },
    take: limit,
  });

  for (const photo of photos) {
    if (!apply) {
      console.log(JSON.stringify({ photoId: photo.id, childId: photo.childId, status: "DRY_RUN" }));
      continue;
    }
    let uploadedReference: string | null = null;
    try {
      const buffer = await loadLegacy(photo.url);
      const contentType = detectImageType(buffer);
      if (!contentType) throw new Error("Magic bytes não correspondem a imagem permitida.");
      const key = `children/${photo.childId}/migrated-${Date.now()}-${randomUUID()}.${extensionFor(contentType)}`;
      uploadedReference = await uploadFile(key, buffer, contentType);
      const updated = await prisma.photo.updateMany({ where: { id: photo.id, url: photo.url }, data: { url: uploadedReference } });
      if (updated.count !== 1) throw new Error("Registro mudou durante a migração; origem preservada.");
      console.log(JSON.stringify({ photoId: photo.id, childId: photo.childId, status: "MIGRATED" }));
    } catch (error) {
      if (uploadedReference) await deleteStoredObject(uploadedReference).catch(() => {});
      console.error(JSON.stringify({ photoId: photo.id, childId: photo.childId, status: "FAILED", error: error instanceof Error ? error.message : "Erro desconhecido" }));
    }
  }
} catch {
  console.error(JSON.stringify({ status: "FAILED", error: "Não foi possível conectar ao banco configurado." }));
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
}

void main();
