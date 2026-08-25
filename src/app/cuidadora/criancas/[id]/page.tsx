import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { todayDateOnly, todayRange, formatTime } from "@/lib/date";
import { buildTimeline } from "@/lib/journey";
import { uploadChildPhotoAction } from "@/lib/photo-actions";
import { RELATIONSHIP_LABELS } from "@/lib/labels";
import { ChildStatusBadge, IncidentIndicator, type PresenceStatus } from "../../ChildStatusBadge";
import { ChildActionsGrid } from "./ChildActionsGrid";
import { RoutineTimeline } from "./RoutineTimeline";
import {
  addMealAction,
  startSleepAction,
  endSleepAction,
  addHygieneAction,
  addWaterAction,
  addMoodAction,
  addIncidentAction,
  addMedicationAdministrationAction,
  addActivityAction,
} from "./actions";

export default async function ChildProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: childId } = await params;
  const date = todayDateOnly();
  const { start, end } = todayRange();

  const child = await prisma.child.findUnique({ where: { id: childId } });
  if (!child) notFound();

  const [attendance, timeline, sleeps, medicationAuthorizations, photos, openIncidents] = await Promise.all([
    prisma.attendance.findUnique({ where: { childId_date: { childId, date } } }),
    buildTimeline(childId, start, end),
    prisma.sleepRecord.findMany({ where: { childId, startTime: { gte: start, lt: end } } }),
    prisma.medicationAuthorization.findMany({ where: { childId, active: true } }),
    prisma.photo.findMany({ where: { childId, takenAt: { gte: start, lt: end } }, orderBy: { takenAt: "desc" } }),
    prisma.incident.count({ where: { childId, time: { gte: start, lt: end }, guardianNotifiedId: null } }),
  ]);

  const openSleep = sleeps.find((s) => !s.endTime) ?? null;
  const status: PresenceStatus = attendance?.checkOutTime ? "left" : attendance?.checkInTime ? "present" : "waiting";
  const name = child.preferredName || child.fullName;
  const revalidateTo = `/cuidadora/criancas/${childId}`;

  return (
    <div className="p-4 sm:p-6 flex flex-col gap-5 max-w-2xl mx-auto">
      <Link href="/cuidadora" className="text-sm font-semibold text-tata-ink-soft min-h-11 flex items-center gap-1 -ml-1">
        ← Voltar
      </Link>

      <div className="bg-tata-surface rounded-tata-lg shadow-tata-card p-5 flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <h1 className="font-[family-name:var(--font-baloo)] font-semibold text-xl text-tata-ink">{name}</h1>
          <div className="flex flex-wrap gap-1.5 justify-end">
            <ChildStatusBadge status={status} />
            {openIncidents > 0 && <IncidentIndicator />}
          </div>
        </div>

        {attendance?.checkInTime && (
          <p className="text-sm text-tata-ink-soft">
            Entrada: <span className="font-semibold text-tata-ink">{formatTime(attendance.checkInTime)}</span>
            {attendance.checkInPersonName && (
              <>
                {" "}— trazida por{" "}
                <span className="font-semibold text-tata-ink">
                  {attendance.checkInPersonName}
                  {attendance.checkInPersonRelation
                    ? ` (${RELATIONSHIP_LABELS[attendance.checkInPersonRelation] ?? attendance.checkInPersonRelation})`
                    : ""}
                </span>
              </>
            )}
          </p>
        )}
        {attendance?.checkOutTime && (
          <p className="text-sm text-tata-ink-soft">
            Saída: <span className="font-semibold text-tata-ink">{formatTime(attendance.checkOutTime)}</span>
            {attendance.checkOutPersonName && (
              <>
                {" "}— retirada por{" "}
                <span className="font-semibold text-tata-ink">
                  {attendance.checkOutPersonName}
                  {attendance.checkOutPersonRelation
                    ? ` (${RELATIONSHIP_LABELS[attendance.checkOutPersonRelation] ?? attendance.checkOutPersonRelation})`
                    : ""}
                </span>
              </>
            )}
          </p>
        )}
        {status === "waiting" && <p className="text-sm text-tata-ink-muted">Ainda não chegou hoje.</p>}
      </div>

      <div>
        <h2 className="font-[family-name:var(--font-baloo)] font-semibold text-sm text-tata-ink mb-2.5">Ações</h2>
        <ChildActionsGrid
          childId={childId}
          revalidateTo={revalidateTo}
          imageAuthorized={child.imageAuthorized}
          openSleep={openSleep}
          medicationAuthorizations={medicationAuthorizations}
          addMealAction={addMealAction}
          startSleepAction={startSleepAction}
          endSleepAction={endSleepAction}
          addHygieneAction={addHygieneAction}
          addWaterAction={addWaterAction}
          addActivityAction={addActivityAction}
          addMoodAction={addMoodAction}
          addIncidentAction={addIncidentAction}
          addMedicationAdministrationAction={addMedicationAdministrationAction}
          uploadChildPhotoAction={uploadChildPhotoAction}
        />
      </div>

      {photos.length > 0 && (
        <div>
          <h2 className="font-[family-name:var(--font-baloo)] font-semibold text-sm text-tata-ink mb-2.5">Fotos de hoje</h2>
          <div className="grid grid-cols-3 gap-1.5">
            {photos.map((p) => (
              <div key={p.id} className="relative aspect-square rounded-xl overflow-hidden bg-tata-surface-hover">
                <Image src={p.url} alt={p.caption ?? ""} fill sizes="150px" className="object-cover" />
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="font-[family-name:var(--font-baloo)] font-semibold text-sm text-tata-ink mb-2.5">Rotina de hoje</h2>
        <div className="bg-tata-surface rounded-tata-lg shadow-tata-card p-5">
          <RoutineTimeline entries={timeline} />
        </div>
      </div>
    </div>
  );
}
