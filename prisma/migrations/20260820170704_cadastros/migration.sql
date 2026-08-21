-- CreateEnum
CREATE TYPE "Sex" AS ENUM ('FEMALE', 'MALE');

-- CreateEnum
CREATE TYPE "ChildStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "Relationship" AS ENUM ('MOTHER', 'FATHER', 'GRANDMOTHER', 'GRANDFATHER', 'AUNT', 'UNCLE', 'SIBLING', 'LEGAL_GUARDIAN', 'OTHER');

-- CreateEnum
CREATE TYPE "AuthorizedPersonStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateTable
CREATE TABLE "children" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "preferredName" TEXT,
    "photoUrl" TEXT,
    "birthDate" TIMESTAMP(3) NOT NULL,
    "cpf" TEXT,
    "birthCertificate" TEXT,
    "sex" "Sex" NOT NULL,
    "enrollmentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "ChildStatus" NOT NULL DEFAULT 'ACTIVE',
    "generalNotes" TEXT,
    "imageAuthorized" BOOLEAN NOT NULL DEFAULT false,
    "contractedEntryTime" TEXT NOT NULL,
    "contractedExitTime" TEXT NOT NULL,
    "contractedDays" TEXT[],
    "toleranceMinutes" INTEGER NOT NULL DEFAULT 0,
    "monthlyFee" DECIMAL(10,2) NOT NULL,
    "overtimeHourRate" DECIMAL(10,2) NOT NULL,
    "dueDay" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "children_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guardians" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "cpf" TEXT NOT NULL,
    "birthDate" TIMESTAMP(3),
    "phone" TEXT NOT NULL,
    "whatsapp" TEXT,
    "email" TEXT,
    "address" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "guardians_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guardian_children" (
    "id" TEXT NOT NULL,
    "guardianId" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "relationship" "Relationship" NOT NULL,
    "isFinancialResponsible" BOOLEAN NOT NULL DEFAULT false,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "receiveNotifications" BOOLEAN NOT NULL DEFAULT true,
    "viewRoutine" BOOLEAN NOT NULL DEFAULT true,
    "viewPhotos" BOOLEAN NOT NULL DEFAULT true,
    "authorizeMedication" BOOLEAN NOT NULL DEFAULT false,
    "authorizePickup" BOOLEAN NOT NULL DEFAULT false,
    "viewFinancial" BOOLEAN NOT NULL DEFAULT false,
    "receiveCommunications" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "guardian_children_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "authorized_pickup_people" (
    "id" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cpf" TEXT,
    "phone" TEXT NOT NULL,
    "relationship" "Relationship" NOT NULL,
    "photoUrl" TEXT,
    "notes" TEXT,
    "status" "AuthorizedPersonStatus" NOT NULL DEFAULT 'ACTIVE',
    "authorizedByGuardianId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "authorized_pickup_people_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "guardians_userId_key" ON "guardians"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "guardian_children_guardianId_childId_key" ON "guardian_children"("guardianId", "childId");

-- AddForeignKey
ALTER TABLE "guardians" ADD CONSTRAINT "guardians_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guardian_children" ADD CONSTRAINT "guardian_children_guardianId_fkey" FOREIGN KEY ("guardianId") REFERENCES "guardians"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guardian_children" ADD CONSTRAINT "guardian_children_childId_fkey" FOREIGN KEY ("childId") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "authorized_pickup_people" ADD CONSTRAINT "authorized_pickup_people_childId_fkey" FOREIGN KEY ("childId") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "authorized_pickup_people" ADD CONSTRAINT "authorized_pickup_people_authorizedByGuardianId_fkey" FOREIGN KEY ("authorizedByGuardianId") REFERENCES "guardians"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
