-- CreateEnum
CREATE TYPE "AnnouncementType" AS ENUM ('ANNOUNCEMENT', 'NOTICE', 'REMINDER', 'EVENT', 'INFO');

-- CreateEnum
CREATE TYPE "AnnouncementTarget" AS ENUM ('ALL', 'GUARDIAN', 'CHILD');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('ARRIVAL', 'DEPARTURE', 'MEAL', 'SLEEP', 'PHOTO', 'INCIDENT', 'ANNOUNCEMENT');

-- CreateTable
CREATE TABLE "announcements" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "type" "AnnouncementType" NOT NULL DEFAULT 'ANNOUNCEMENT',
    "target" "AnnouncementTarget" NOT NULL DEFAULT 'ALL',
    "eventDate" TIMESTAMP(3),
    "targetGuardianId" TEXT,
    "targetChildId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "announcements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "guardianId" TEXT NOT NULL,
    "childId" TEXT,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_targetGuardianId_fkey" FOREIGN KEY ("targetGuardianId") REFERENCES "guardians"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_targetChildId_fkey" FOREIGN KEY ("targetChildId") REFERENCES "children"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_guardianId_fkey" FOREIGN KEY ("guardianId") REFERENCES "guardians"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_childId_fkey" FOREIGN KEY ("childId") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE CASCADE;
