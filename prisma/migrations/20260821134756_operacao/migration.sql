-- CreateEnum
CREATE TYPE "MealType" AS ENUM ('BREAKFAST', 'SNACK', 'LUNCH', 'AFTERNOON_SNACK', 'DINNER', 'OTHER');

-- CreateEnum
CREATE TYPE "ConsumptionLevel" AS ENUM ('ALL', 'WELL', 'LITTLE', 'NONE');

-- CreateEnum
CREATE TYPE "HygieneType" AS ENUM ('BATHROOM', 'DIAPER_CHANGE', 'PERSONAL_HYGIENE', 'HANDWASHING', 'TOOTHBRUSHING', 'OTHER');

-- CreateEnum
CREATE TYPE "ActivityCategory" AS ENUM ('PAINTING', 'DRAWING', 'MUSIC', 'STORY', 'GAMES', 'RECREATION', 'OUTDOOR', 'MOTOR_COORDINATION', 'PEDAGOGICAL', 'FREE_PLAY', 'OTHER');

-- CreateEnum
CREATE TYPE "Mood" AS ENUM ('VERY_HAPPY', 'HAPPY', 'GOOD', 'NORMAL', 'TIRED', 'SAD', 'CRIED', 'IRRITATED', 'OTHER');

-- CreateEnum
CREATE TYPE "IncidentType" AS ENUM ('FALL', 'ACCIDENT', 'CRYING', 'ILLNESS', 'FEVER', 'BEHAVIOR_CHANGE', 'INJURY', 'OTHER');

-- CreateTable
CREATE TABLE "attendances" (
    "id" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "checkInTime" TIMESTAMP(3),
    "checkInPersonName" TEXT,
    "checkInPersonRelation" TEXT,
    "checkInReceivedById" TEXT,
    "checkOutTime" TIMESTAMP(3),
    "checkOutPersonName" TEXT,
    "checkOutPersonRelation" TEXT,
    "checkOutReceivedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attendances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "home_departures" (
    "id" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "guardianId" TEXT NOT NULL,
    "time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "home_departures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meal_records" (
    "id" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "mealType" "MealType" NOT NULL,
    "consumption" "ConsumptionLevel" NOT NULL,
    "notes" TEXT,
    "recordedById" TEXT NOT NULL,

    CONSTRAINT "meal_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sleep_records" (
    "id" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endTime" TIMESTAMP(3),
    "startedById" TEXT NOT NULL,
    "endedById" TEXT,

    CONSTRAINT "sleep_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hygiene_records" (
    "id" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" "HygieneType" NOT NULL,
    "notes" TEXT,
    "recordedById" TEXT NOT NULL,

    CONSTRAINT "hygiene_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activities" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "category" "ActivityCategory" NOT NULL,
    "description" TEXT,
    "notes" TEXT,
    "recordedById" TEXT NOT NULL,

    CONSTRAINT "activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_children" (
    "activityId" TEXT NOT NULL,
    "childId" TEXT NOT NULL,

    CONSTRAINT "activity_children_pkey" PRIMARY KEY ("activityId","childId")
);

-- CreateTable
CREATE TABLE "mood_records" (
    "id" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "mood" "Mood" NOT NULL,
    "notes" TEXT,
    "recordedById" TEXT NOT NULL,

    CONSTRAINT "mood_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "health_profiles" (
    "id" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "allergies" TEXT,
    "dietaryRestrictions" TEXT,
    "authorizedMedications" TEXT,
    "importantInfo" TEXT,
    "healthInsurance" TEXT,
    "doctorName" TEXT,
    "emergencyPhone" TEXT,
    "notes" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "health_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "health_logs" (
    "id" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "temperature" DECIMAL(4,1),
    "symptoms" TEXT,
    "notes" TEXT,
    "recordedById" TEXT NOT NULL,

    CONSTRAINT "health_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medication_authorizations" (
    "id" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "medication" TEXT NOT NULL,
    "dosage" TEXT NOT NULL,
    "scheduleTime" TEXT,
    "instructions" TEXT,
    "authorizedByGuardianId" TEXT NOT NULL,
    "documentUrl" TEXT,
    "validFrom" TIMESTAMP(3) NOT NULL,
    "validUntil" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "medication_authorizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medication_administrations" (
    "id" TEXT NOT NULL,
    "authorizationId" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "administeredById" TEXT NOT NULL,
    "notes" TEXT,

    CONSTRAINT "medication_administrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incidents" (
    "id" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" "IncidentType" NOT NULL,
    "description" TEXT NOT NULL,
    "actionsTaken" TEXT,
    "recordedById" TEXT NOT NULL,
    "guardianNotifiedId" TEXT,
    "notifiedAt" TIMESTAMP(3),

    CONSTRAINT "incidents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "photos" (
    "id" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "activityId" TEXT,
    "incidentId" TEXT,
    "url" TEXT NOT NULL,
    "caption" TEXT,
    "takenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uploadedById" TEXT NOT NULL,

    CONSTRAINT "photos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "attendances_childId_date_key" ON "attendances"("childId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "health_profiles_childId_key" ON "health_profiles"("childId");

-- AddForeignKey
ALTER TABLE "attendances" ADD CONSTRAINT "attendances_childId_fkey" FOREIGN KEY ("childId") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendances" ADD CONSTRAINT "attendances_checkInReceivedById_fkey" FOREIGN KEY ("checkInReceivedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendances" ADD CONSTRAINT "attendances_checkOutReceivedById_fkey" FOREIGN KEY ("checkOutReceivedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "home_departures" ADD CONSTRAINT "home_departures_childId_fkey" FOREIGN KEY ("childId") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "home_departures" ADD CONSTRAINT "home_departures_guardianId_fkey" FOREIGN KEY ("guardianId") REFERENCES "guardians"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_records" ADD CONSTRAINT "meal_records_childId_fkey" FOREIGN KEY ("childId") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_records" ADD CONSTRAINT "meal_records_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sleep_records" ADD CONSTRAINT "sleep_records_childId_fkey" FOREIGN KEY ("childId") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sleep_records" ADD CONSTRAINT "sleep_records_startedById_fkey" FOREIGN KEY ("startedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sleep_records" ADD CONSTRAINT "sleep_records_endedById_fkey" FOREIGN KEY ("endedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hygiene_records" ADD CONSTRAINT "hygiene_records_childId_fkey" FOREIGN KEY ("childId") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hygiene_records" ADD CONSTRAINT "hygiene_records_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_children" ADD CONSTRAINT "activity_children_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "activities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_children" ADD CONSTRAINT "activity_children_childId_fkey" FOREIGN KEY ("childId") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mood_records" ADD CONSTRAINT "mood_records_childId_fkey" FOREIGN KEY ("childId") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mood_records" ADD CONSTRAINT "mood_records_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_profiles" ADD CONSTRAINT "health_profiles_childId_fkey" FOREIGN KEY ("childId") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_logs" ADD CONSTRAINT "health_logs_childId_fkey" FOREIGN KEY ("childId") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_logs" ADD CONSTRAINT "health_logs_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medication_authorizations" ADD CONSTRAINT "medication_authorizations_childId_fkey" FOREIGN KEY ("childId") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medication_authorizations" ADD CONSTRAINT "medication_authorizations_authorizedByGuardianId_fkey" FOREIGN KEY ("authorizedByGuardianId") REFERENCES "guardians"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medication_administrations" ADD CONSTRAINT "medication_administrations_authorizationId_fkey" FOREIGN KEY ("authorizationId") REFERENCES "medication_authorizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medication_administrations" ADD CONSTRAINT "medication_administrations_childId_fkey" FOREIGN KEY ("childId") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medication_administrations" ADD CONSTRAINT "medication_administrations_administeredById_fkey" FOREIGN KEY ("administeredById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_childId_fkey" FOREIGN KEY ("childId") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_guardianNotifiedId_fkey" FOREIGN KEY ("guardianNotifiedId") REFERENCES "guardians"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "photos" ADD CONSTRAINT "photos_childId_fkey" FOREIGN KEY ("childId") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "photos" ADD CONSTRAINT "photos_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "activities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "photos" ADD CONSTRAINT "photos_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "incidents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "photos" ADD CONSTRAINT "photos_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
