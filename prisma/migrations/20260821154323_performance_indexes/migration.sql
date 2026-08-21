-- CreateIndex
CREATE INDEX "activities_date_idx" ON "activities"("date");

-- CreateIndex
CREATE INDEX "activities_time_idx" ON "activities"("time");

-- CreateIndex
CREATE INDEX "activity_children_childId_idx" ON "activity_children"("childId");

-- CreateIndex
CREATE INDEX "announcements_target_idx" ON "announcements"("target");

-- CreateIndex
CREATE INDEX "announcements_type_eventDate_idx" ON "announcements"("type", "eventDate");

-- CreateIndex
CREATE INDEX "attendances_date_idx" ON "attendances"("date");

-- CreateIndex
CREATE INDEX "guardian_children_childId_idx" ON "guardian_children"("childId");

-- CreateIndex
CREATE INDEX "health_logs_childId_time_idx" ON "health_logs"("childId", "time");

-- CreateIndex
CREATE INDEX "health_logs_time_idx" ON "health_logs"("time");

-- CreateIndex
CREATE INDEX "hygiene_records_childId_time_idx" ON "hygiene_records"("childId", "time");

-- CreateIndex
CREATE INDEX "hygiene_records_time_idx" ON "hygiene_records"("time");

-- CreateIndex
CREATE INDEX "incidents_childId_time_idx" ON "incidents"("childId", "time");

-- CreateIndex
CREATE INDEX "incidents_time_idx" ON "incidents"("time");

-- CreateIndex
CREATE INDEX "incidents_guardianNotifiedId_idx" ON "incidents"("guardianNotifiedId");

-- CreateIndex
CREATE INDEX "meal_records_childId_time_idx" ON "meal_records"("childId", "time");

-- CreateIndex
CREATE INDEX "meal_records_time_idx" ON "meal_records"("time");

-- CreateIndex
CREATE INDEX "medication_administrations_childId_time_idx" ON "medication_administrations"("childId", "time");

-- CreateIndex
CREATE INDEX "medication_administrations_time_idx" ON "medication_administrations"("time");

-- CreateIndex
CREATE INDEX "medication_authorizations_childId_active_idx" ON "medication_authorizations"("childId", "active");

-- CreateIndex
CREATE INDEX "monthly_invoices_status_idx" ON "monthly_invoices"("status");

-- CreateIndex
CREATE INDEX "monthly_invoices_createdAt_idx" ON "monthly_invoices"("createdAt");

-- CreateIndex
CREATE INDEX "mood_records_childId_time_idx" ON "mood_records"("childId", "time");

-- CreateIndex
CREATE INDEX "mood_records_time_idx" ON "mood_records"("time");

-- CreateIndex
CREATE INDEX "notifications_guardianId_read_idx" ON "notifications"("guardianId", "read");

-- CreateIndex
CREATE INDEX "payments_paidAt_idx" ON "payments"("paidAt");

-- CreateIndex
CREATE INDEX "photos_childId_takenAt_idx" ON "photos"("childId", "takenAt");

-- CreateIndex
CREATE INDEX "photos_takenAt_idx" ON "photos"("takenAt");

-- CreateIndex
CREATE INDEX "sleep_records_childId_startTime_idx" ON "sleep_records"("childId", "startTime");

-- CreateIndex
CREATE INDEX "sleep_records_startTime_idx" ON "sleep_records"("startTime");
