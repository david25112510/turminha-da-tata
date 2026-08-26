-- CreateEnum
CREATE TYPE "DiaperType" AS ENUM ('WET', 'DIRTY', 'BOTH', 'DRY', 'OTHER');

-- CreateEnum
CREATE TYPE "MedicationAuthorizationStatus" AS ENUM ('PENDING', 'ACTIVE', 'PAUSED', 'ENDED', 'REFUSED');

-- CreateEnum
CREATE TYPE "ChildNoteAuthorRole" AS ENUM ('CAREGIVER', 'GUARDIAN');

-- CreateEnum
CREATE TYPE "ChildNoteStatus" AS ENUM ('NEW', 'READ', 'ANSWERED', 'ARCHIVED');

-- AlterEnum
ALTER TYPE "AdminNotificationType" ADD VALUE 'OBSERVATION';

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'OBSERVATION';

-- AlterTable
ALTER TABLE "hygiene_records" ADD COLUMN     "diaperType" "DiaperType";

-- AlterTable
ALTER TABLE "medication_authorizations" ADD COLUMN     "reviewNotes" TEXT,
ADD COLUMN     "reviewedAt" TIMESTAMP(3),
ADD COLUMN     "reviewedByUserId" TEXT,
ADD COLUMN     "status" "MedicationAuthorizationStatus" NOT NULL DEFAULT 'PENDING';

-- CreateTable
CREATE TABLE "child_notes" (
    "id" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "authorRole" "ChildNoteAuthorRole" NOT NULL,
    "authorUserId" TEXT,
    "authorGuardianId" TEXT,
    "text" TEXT NOT NULL,
    "status" "ChildNoteStatus" NOT NULL DEFAULT 'NEW',
    "time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "child_notes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "child_notes_childId_time_idx" ON "child_notes"("childId", "time");

-- CreateIndex
CREATE INDEX "child_notes_childId_authorRole_status_idx" ON "child_notes"("childId", "authorRole", "status");

-- CreateIndex
CREATE INDEX "medication_authorizations_childId_status_idx" ON "medication_authorizations"("childId", "status");

-- AddForeignKey
ALTER TABLE "medication_authorizations" ADD CONSTRAINT "medication_authorizations_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "child_notes" ADD CONSTRAINT "child_notes_childId_fkey" FOREIGN KEY ("childId") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "child_notes" ADD CONSTRAINT "child_notes_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "child_notes" ADD CONSTRAINT "child_notes_authorGuardianId_fkey" FOREIGN KEY ("authorGuardianId") REFERENCES "guardians"("id") ON DELETE SET NULL ON UPDATE CASCADE;
