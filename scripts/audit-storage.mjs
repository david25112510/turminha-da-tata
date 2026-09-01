import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL não definida; auditoria cancelada sem alterar dados.");
  process.exit(1);
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

function storageType(url) {
  if (url.startsWith("storage://")) return "PRIVATE_STORAGE";
  if (url.startsWith("/uploads/")) return "LOCAL_LEGACY";
  if (url.startsWith("https://")) return "PUBLIC_HTTPS";
  if (url.startsWith("http://")) return "PUBLIC_HTTP";
  return "UNKNOWN";
}

try {
  const photos = await prisma.photo.findMany({ select: { id: true, childId: true, url: true }, orderBy: { id: "asc" } });
  const counts = { PRIVATE_STORAGE: 0, LOCAL_LEGACY: 0, PUBLIC_HTTP: 0, PUBLIC_HTTPS: 0, UNKNOWN: 0 };
  const rows = photos.map((photo) => {
    const type = storageType(photo.url);
    counts[type] += 1;
    return { photoId: photo.id, childId: photo.childId, storageType: type, migrationStatus: type === "PRIVATE_STORAGE" ? "NOT_REQUIRED" : "PENDING" };
  });

  console.log(JSON.stringify({ mode: "READ_ONLY", TOTAL_PHOTOS: photos.length, ...counts, photos: rows }, null, 2));
} catch {
  console.error(JSON.stringify({ mode: "READ_ONLY", status: "FAILED", error: "Não foi possível conectar ao banco configurado." }));
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
