-- AlterTable
ALTER TABLE "attendances" ADD COLUMN     "checkInAuthorizedPickupPersonId" TEXT,
ADD COLUMN     "checkInGuardianId" TEXT,
ADD COLUMN     "checkOutAuthorizedPickupPersonId" TEXT,
ADD COLUMN     "checkOutGuardianId" TEXT;

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "oldData" JSONB,
    "newData" JSONB,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "audit_logs_entity_entityId_idx" ON "audit_logs"("entity", "entityId");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- AddForeignKey
ALTER TABLE "attendances" ADD CONSTRAINT "attendances_checkInGuardianId_fkey" FOREIGN KEY ("checkInGuardianId") REFERENCES "guardians"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendances" ADD CONSTRAINT "attendances_checkInAuthorizedPickupPersonId_fkey" FOREIGN KEY ("checkInAuthorizedPickupPersonId") REFERENCES "authorized_pickup_people"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendances" ADD CONSTRAINT "attendances_checkOutGuardianId_fkey" FOREIGN KEY ("checkOutGuardianId") REFERENCES "guardians"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendances" ADD CONSTRAINT "attendances_checkOutAuthorizedPickupPersonId_fkey" FOREIGN KEY ("checkOutAuthorizedPickupPersonId") REFERENCES "authorized_pickup_people"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
