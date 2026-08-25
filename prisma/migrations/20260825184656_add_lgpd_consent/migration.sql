-- CreateEnum
CREATE TYPE "ConsentVersionStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ConsentAcceptanceStatus" AS ENUM ('PENDING', 'ACCEPTED');

-- AlterTable
ALTER TABLE "children" ADD COLUMN     "inactivatedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "consent_versions" (
    "id" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "status" "ConsentVersionStatus" NOT NULL DEFAULT 'PUBLISHED',
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publishedAt" TIMESTAMP(3),

    CONSTRAINT "consent_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consent_acceptances" (
    "id" TEXT NOT NULL,
    "guardianId" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "status" "ConsentAcceptanceStatus" NOT NULL DEFAULT 'PENDING',
    "acceptedAt" TIMESTAMP(3),
    "acceptedByUserId" TEXT,
    "ip" TEXT,
    "userAgent" TEXT,
    "signatureUrl" TEXT,
    "signedAt" TIMESTAMP(3),
    "documentHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consent_acceptances_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "consent_acceptances_guardianId_status_idx" ON "consent_acceptances"("guardianId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "consent_acceptances_guardianId_versionId_key" ON "consent_acceptances"("guardianId", "versionId");

-- AddForeignKey
ALTER TABLE "consent_versions" ADD CONSTRAINT "consent_versions_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consent_acceptances" ADD CONSTRAINT "consent_acceptances_guardianId_fkey" FOREIGN KEY ("guardianId") REFERENCES "guardians"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consent_acceptances" ADD CONSTRAINT "consent_acceptances_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "consent_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consent_acceptances" ADD CONSTRAINT "consent_acceptances_acceptedByUserId_fkey" FOREIGN KEY ("acceptedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
