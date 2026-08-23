import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

/**
 * Cliente Prisma independente para os scripts de setup/teardown do E2E — não reaproveita src/lib/prisma.ts
 * porque este arquivo roda fora do runtime do Next.js (sob o Node do Playwright), onde o alias "@/" não é
 * garantido. dotenv é carregado em playwright.config.ts antes deste módulo ser importado.
 */
export const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
