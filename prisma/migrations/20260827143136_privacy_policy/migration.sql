-- CreateEnum
CREATE TYPE "PrivacyPolicyVersionStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "PrivacyPolicyAcceptanceStatus" AS ENUM ('PENDING', 'ACCEPTED');

-- CreateTable
CREATE TABLE "privacy_policy_versions" (
    "id" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "status" "PrivacyPolicyVersionStatus" NOT NULL DEFAULT 'PUBLISHED',
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publishedAt" TIMESTAMP(3),

    CONSTRAINT "privacy_policy_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "privacy_policy_acceptances" (
    "id" TEXT NOT NULL,
    "guardianId" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "status" "PrivacyPolicyAcceptanceStatus" NOT NULL DEFAULT 'PENDING',
    "acceptedAt" TIMESTAMP(3),
    "acceptedByUserId" TEXT,
    "ip" TEXT,
    "userAgent" TEXT,
    "signatureUrl" TEXT,
    "signedAt" TIMESTAMP(3),
    "documentHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "privacy_policy_acceptances_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "privacy_policy_acceptances_guardianId_status_idx" ON "privacy_policy_acceptances"("guardianId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "privacy_policy_acceptances_guardianId_versionId_key" ON "privacy_policy_acceptances"("guardianId", "versionId");

-- AddForeignKey
ALTER TABLE "privacy_policy_versions" ADD CONSTRAINT "privacy_policy_versions_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "privacy_policy_acceptances" ADD CONSTRAINT "privacy_policy_acceptances_guardianId_fkey" FOREIGN KEY ("guardianId") REFERENCES "guardians"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "privacy_policy_acceptances" ADD CONSTRAINT "privacy_policy_acceptances_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "privacy_policy_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "privacy_policy_acceptances" ADD CONSTRAINT "privacy_policy_acceptances_acceptedByUserId_fkey" FOREIGN KEY ("acceptedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

