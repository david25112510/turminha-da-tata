import { cleanupE2EData } from "./cleanup";
import { prisma } from "./prisma-client";

export default async function globalTeardown() {
  await cleanupE2EData();
  await prisma.$disconnect();
}
