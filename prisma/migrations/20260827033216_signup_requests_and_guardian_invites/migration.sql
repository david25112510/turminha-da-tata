-- CreateEnum
CREATE TYPE "GuardianInviteStatus" AS ENUM ('PENDING', 'USED', 'EXPIRED', 'REVOKED');

-- CreateEnum
CREATE TYPE "SignupRequestRole" AS ENUM ('CAREGIVER', 'GUARDIAN');

-- CreateEnum
CREATE TYPE "SignupRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterEnum
ALTER TYPE "AdminNotificationType" ADD VALUE 'SIGNUP_REQUEST';

-- CreateTable
CREATE TABLE "guardian_invites" (
    "id" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "status" "GuardianInviteStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdByUserId" TEXT,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "guardian_invites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "signup_requests" (
    "id" TEXT NOT NULL,
    "role" "SignupRequestRole" NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "phone" TEXT,
    "cpf" TEXT,
    "inviteId" TEXT,
    "relationship" "Relationship",
    "status" "SignupRequestStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedByUserId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "signup_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "guardian_invites_codeHash_key" ON "guardian_invites"("codeHash");

-- CreateIndex
CREATE INDEX "guardian_invites_childId_idx" ON "guardian_invites"("childId");

-- CreateIndex
CREATE INDEX "signup_requests_status_idx" ON "signup_requests"("status");

-- AddForeignKey
ALTER TABLE "guardian_invites" ADD CONSTRAINT "guardian_invites_childId_fkey" FOREIGN KEY ("childId") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guardian_invites" ADD CONSTRAINT "guardian_invites_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "signup_requests" ADD CONSTRAINT "signup_requests_inviteId_fkey" FOREIGN KEY ("inviteId") REFERENCES "guardian_invites"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "signup_requests" ADD CONSTRAINT "signup_requests_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
