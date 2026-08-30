CREATE TYPE "EnrollmentRequestStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'CANCELLED');

CREATE TABLE "enrollment_requests" (
  "id" TEXT NOT NULL,
  "guardianId" TEXT NOT NULL,
  "status" "EnrollmentRequestStatus" NOT NULL DEFAULT 'DRAFT',
  "childFullName" TEXT NOT NULL,
  "childPreferredName" TEXT,
  "childBirthDate" TIMESTAMP(3) NOT NULL,
  "childSex" "Sex" NOT NULL,
  "childCpf" TEXT,
  "birthCertificate" TEXT,
  "childPhotoUrl" TEXT,
  "allergies" TEXT,
  "dietaryRestrictions" TEXT,
  "medications" TEXT,
  "relevantConditions" TEXT,
  "specificNeeds" TEXT,
  "importantCareInfo" TEXT,
  "generalNotes" TEXT,
  "relationship" "Relationship" NOT NULL DEFAULT 'LEGAL_GUARDIAN',
  "imageAuthInternal" BOOLEAN NOT NULL DEFAULT false,
  "imageAuthGuardianShare" BOOLEAN NOT NULL DEFAULT false,
  "imageAuthInstitutional" BOOLEAN NOT NULL DEFAULT false,
  "imageAuthSocialMedia" BOOLEAN NOT NULL DEFAULT false,
  "imageAuthAdvertising" BOOLEAN NOT NULL DEFAULT false,
  "submittedAt" TIMESTAMP(3),
  "reviewedByUserId" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "rejectionReason" TEXT,
  "approvedChildId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "enrollment_requests_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "enrollment_authorized_people" (
  "id" TEXT NOT NULL,
  "enrollmentRequestId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "cpf" TEXT,
  "phone" TEXT NOT NULL,
  "relationship" "Relationship" NOT NULL,
  "notes" TEXT,
  "photoUrl" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "enrollment_authorized_people_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "enrollment_requests_approvedChildId_key" ON "enrollment_requests"("approvedChildId");
CREATE INDEX "enrollment_requests_guardianId_status_idx" ON "enrollment_requests"("guardianId", "status");
CREATE INDEX "enrollment_requests_status_submittedAt_idx" ON "enrollment_requests"("status", "submittedAt");
CREATE INDEX "enrollment_authorized_people_enrollmentRequestId_idx" ON "enrollment_authorized_people"("enrollmentRequestId");
ALTER TABLE "enrollment_requests" ADD CONSTRAINT "enrollment_requests_guardianId_fkey" FOREIGN KEY ("guardianId") REFERENCES "guardians"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "enrollment_requests" ADD CONSTRAINT "enrollment_requests_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "enrollment_authorized_people" ADD CONSTRAINT "enrollment_authorized_people_enrollmentRequestId_fkey" FOREIGN KEY ("enrollmentRequestId") REFERENCES "enrollment_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
