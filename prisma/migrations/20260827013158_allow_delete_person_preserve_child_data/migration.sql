-- DropForeignKey
ALTER TABLE "activities" DROP CONSTRAINT "activities_recordedById_fkey";

-- DropForeignKey
ALTER TABLE "announcements" DROP CONSTRAINT "announcements_createdById_fkey";

-- DropForeignKey
ALTER TABLE "audit_logs" DROP CONSTRAINT "audit_logs_actorUserId_fkey";

-- DropForeignKey
ALTER TABLE "authorized_pickup_people" DROP CONSTRAINT "authorized_pickup_people_authorizedByGuardianId_fkey";

-- DropForeignKey
ALTER TABLE "health_logs" DROP CONSTRAINT "health_logs_recordedById_fkey";

-- DropForeignKey
ALTER TABLE "home_departures" DROP CONSTRAINT "home_departures_guardianId_fkey";

-- DropForeignKey
ALTER TABLE "hygiene_records" DROP CONSTRAINT "hygiene_records_recordedById_fkey";

-- DropForeignKey
ALTER TABLE "incidents" DROP CONSTRAINT "incidents_recordedById_fkey";

-- DropForeignKey
ALTER TABLE "meal_records" DROP CONSTRAINT "meal_records_recordedById_fkey";

-- DropForeignKey
ALTER TABLE "medication_administrations" DROP CONSTRAINT "medication_administrations_administeredById_fkey";

-- DropForeignKey
ALTER TABLE "medication_authorizations" DROP CONSTRAINT "medication_authorizations_authorizedByGuardianId_fkey";

-- DropForeignKey
ALTER TABLE "mood_records" DROP CONSTRAINT "mood_records_recordedById_fkey";

-- DropForeignKey
ALTER TABLE "payments" DROP CONSTRAINT "payments_recordedById_fkey";

-- DropForeignKey
ALTER TABLE "photos" DROP CONSTRAINT "photos_uploadedById_fkey";

-- DropForeignKey
ALTER TABLE "sleep_records" DROP CONSTRAINT "sleep_records_startedById_fkey";

-- DropForeignKey
ALTER TABLE "water_records" DROP CONSTRAINT "water_records_recordedById_fkey";

-- AlterTable
ALTER TABLE "activities" ALTER COLUMN "recordedById" DROP NOT NULL;

-- AlterTable
ALTER TABLE "announcements" ALTER COLUMN "createdById" DROP NOT NULL;

-- AlterTable
ALTER TABLE "audit_logs" ALTER COLUMN "actorUserId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "health_logs" ALTER COLUMN "recordedById" DROP NOT NULL;

-- AlterTable
ALTER TABLE "hygiene_records" ALTER COLUMN "recordedById" DROP NOT NULL;

-- AlterTable
ALTER TABLE "incidents" ALTER COLUMN "recordedById" DROP NOT NULL;

-- AlterTable
ALTER TABLE "meal_records" ALTER COLUMN "recordedById" DROP NOT NULL;

-- AlterTable
ALTER TABLE "medication_administrations" ALTER COLUMN "administeredById" DROP NOT NULL;

-- AlterTable
ALTER TABLE "medication_authorizations" ALTER COLUMN "authorizedByGuardianId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "mood_records" ALTER COLUMN "recordedById" DROP NOT NULL;

-- AlterTable
ALTER TABLE "payments" ALTER COLUMN "recordedById" DROP NOT NULL;

-- AlterTable
ALTER TABLE "photos" ALTER COLUMN "uploadedById" DROP NOT NULL;

-- AlterTable
ALTER TABLE "sleep_records" ALTER COLUMN "startedById" DROP NOT NULL;

-- AlterTable
ALTER TABLE "water_records" ALTER COLUMN "recordedById" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "authorized_pickup_people" ADD CONSTRAINT "authorized_pickup_people_authorizedByGuardianId_fkey" FOREIGN KEY ("authorizedByGuardianId") REFERENCES "guardians"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "home_departures" ADD CONSTRAINT "home_departures_guardianId_fkey" FOREIGN KEY ("guardianId") REFERENCES "guardians"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_records" ADD CONSTRAINT "meal_records_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sleep_records" ADD CONSTRAINT "sleep_records_startedById_fkey" FOREIGN KEY ("startedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hygiene_records" ADD CONSTRAINT "hygiene_records_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "water_records" ADD CONSTRAINT "water_records_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mood_records" ADD CONSTRAINT "mood_records_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_logs" ADD CONSTRAINT "health_logs_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medication_authorizations" ADD CONSTRAINT "medication_authorizations_authorizedByGuardianId_fkey" FOREIGN KEY ("authorizedByGuardianId") REFERENCES "guardians"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medication_administrations" ADD CONSTRAINT "medication_administrations_administeredById_fkey" FOREIGN KEY ("administeredById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "photos" ADD CONSTRAINT "photos_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
