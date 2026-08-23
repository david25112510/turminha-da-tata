-- CreateIndex
CREATE INDEX "authorized_pickup_people_childId_idx" ON "authorized_pickup_people"("childId");

-- CreateIndex
CREATE INDEX "home_departures_childId_idx" ON "home_departures"("childId");

-- CreateIndex
CREATE INDEX "home_departures_guardianId_idx" ON "home_departures"("guardianId");

-- CreateIndex
CREATE INDEX "payments_invoiceId_idx" ON "payments"("invoiceId");
