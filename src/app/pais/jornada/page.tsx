import { requireGuardian, pickChildLink } from "@/lib/guardian";
import { todayDateOnly, todayRange, formatTime } from "@/lib/date";
import { buildTimeline } from "@/lib/journey";
import { prisma } from "@/lib/prisma";
import { RELATIONSHIP_LABELS } from "@/lib/labels";
import { ChildSwitcher } from "../ChildSwitcher";
import { GuardianStatusBadge, type ChildPresenceStatus } from "../GuardianStatusBadge";
import { TimelineFilter } from "../TimelineFilter";

export default async function GuardianJourneyPage({
  searchParams,
}: {
  searchParams: Promise<{ childId?: string }>;
}) {
  const { childId } = await searchParams;
  const guardian = await requireGuardian();
  const link = pickChildLink(guardian.children, childId);

  if (!link) {
    return <div className="p-8 text-sm text-[#8A7A62]">Nenhuma criança vinculada à sua conta.</div>;
  }

  if (!link.viewRoutine) {
    return (
      <div className="p-8 text-sm text-[#8A7A62]">
        Você não tem permissão para visualizar a rotina desta criança.
      </div>
    );
  }

  const { start, end } = todayRange();
  const [attendance, timeline] = await Promise.all([
    prisma.attendance.findFirst({ where: { childId: link.childId, date: todayDateOnly() } }),
    buildTimeline(link.childId, start, end),
  ]);

  // Foto só entra na timeline unificada se a permissão de fotos também for concedida — buildTimeline() em si
  // não conhece permissão (é a mesma função usada pela cuidadora), o filtro fica no chamador.
  const visibleTimeline = link.viewPhotos ? timeline : timeline.filter((e) => e.label !== "Foto");

  const arrived = !!attendance?.checkInTime;
  const left = !!attendance?.checkOutTime;
  const status: ChildPresenceStatus = left ? "left" : arrived ? "present" : "waiting";
  const checkInRelation = attendance?.checkInPersonRelation
    ? RELATIONSHIP_LABELS[attendance.checkInPersonRelation] ?? attendance.checkInPersonRelation
    : null;

  return (
    <div className="p-4 sm:p-6 flex flex-col gap-5 max-w-2xl mx-auto">
      <ChildSwitcher basePath="/pais/jornada" activeChildId={link.childId} guardianChildren={guardian.children} />

      <div className="bg-[#FFFDF8] rounded-2xl shadow-sm p-5 flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <h1 className="font-[family-name:var(--font-baloo)] font-semibold text-xl text-[#2E2418]">
            {link.child.preferredName || link.child.fullName}
          </h1>
          <GuardianStatusBadge status={status} />
        </div>
        {arrived && (
          <p className="text-sm text-[#6B5D4A]">
            Entrada: <span className="font-semibold text-[#2E2418]">{formatTime(attendance!.checkInTime!)}</span>
            {attendance?.checkInPersonName && (
              <>
                {" "}— quem trouxe:{" "}
                <span className="font-semibold text-[#2E2418]">
                  {attendance.checkInPersonName}
                  {checkInRelation ? ` (${checkInRelation})` : ""}
                </span>
              </>
            )}
          </p>
        )}
      </div>

      <div>
        <h2 className="font-[family-name:var(--font-baloo)] font-semibold text-sm text-[#2E2418] mb-3">
          Rotina de hoje
        </h2>
        <TimelineFilter entries={visibleTimeline} />
      </div>
    </div>
  );
}
