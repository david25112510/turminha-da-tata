import { prisma } from "@/lib/prisma";
import { todayDateOnly, todayRange } from "@/lib/date";
import { checkInAction, checkOutAction } from "./actions";
import { ChildrenSearch, type ChildRow } from "./ChildrenSearch";
import type { PresenceStatus } from "./ChildStatusBadge";
import { EmptyState } from "@/components/tata/EmptyState";

function greeting(hour: number) {
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

export default async function CaregiverHomePage() {
  const date = todayDateOnly();
  const { start, end } = todayRange();
  const now = new Date();

  const [children, openIncidentChildIds] = await Promise.all([
    prisma.child.findMany({
      where: { status: "ACTIVE" },
      orderBy: { fullName: "asc" },
      include: {
        attendances: { where: { date } },
        guardians: { orderBy: { isPrimary: "desc" }, include: { guardian: true } },
        authorizedPickupPeople: { where: { status: "ACTIVE" }, orderBy: { name: "asc" } },
      },
    }),
    prisma.incident.findMany({
      where: { time: { gte: start, lt: end }, guardianNotifiedId: null },
      select: { childId: true },
    }),
  ]);

  const incidentChildIds = new Set(openIncidentChildIds.map((i) => i.childId));

  const rows: ChildRow[] = children.map((child) => {
    const attendance = child.attendances[0];
    const status: PresenceStatus = attendance?.checkOutTime ? "left" : attendance?.checkInTime ? "present" : "waiting";
    return {
      id: child.id,
      name: child.preferredName || child.fullName,
      status,
      checkInTime: attendance?.checkInTime ?? null,
      hasOpenIncident: incidentChildIds.has(child.id),
      people: [
        ...child.guardians.map((link) => ({
          value: `GUARDIAN:${link.guardianId}`,
          name: link.guardian.name,
          relationship: link.relationship,
        })),
        ...child.authorizedPickupPeople.map((person) => ({
          value: `AUTHORIZED:${person.id}`,
          name: person.name,
          relationship: person.relationship,
        })),
      ],
    };
  });

  const present = rows.filter((r) => r.status === "present").length;
  const waiting = rows.filter((r) => r.status === "waiting").length;
  const left = rows.filter((r) => r.status === "left").length;

  return (
    <div className="p-4 sm:p-6 flex flex-col gap-5 max-w-2xl mx-auto">
      <div>
        <h1 className="font-[family-name:var(--font-baloo)] font-semibold text-xl text-tata-ink">
          {greeting(now.getHours())}! ☀️
        </h1>
        <p className="text-sm text-tata-ink-muted">
          {new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "long" }).format(now)}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2.5">
        <div className="bg-tata-surface rounded-tata-lg shadow-tata-card p-3 flex flex-col items-center gap-0.5">
          <span className="text-lg" aria-hidden="true">🟢</span>
          <span className="font-[family-name:var(--font-baloo)] font-semibold text-lg text-tata-ink">{present}</span>
          <span className="text-[10px] text-tata-ink-muted text-center leading-tight">Presentes</span>
        </div>
        <div className="bg-tata-surface rounded-tata-lg shadow-tata-card p-3 flex flex-col items-center gap-0.5">
          <span className="text-lg" aria-hidden="true">🟡</span>
          <span className="font-[family-name:var(--font-baloo)] font-semibold text-lg text-tata-ink">{waiting}</span>
          <span className="text-[10px] text-tata-ink-muted text-center leading-tight">Aguardando</span>
        </div>
        <div className="bg-tata-surface rounded-tata-lg shadow-tata-card p-3 flex flex-col items-center gap-0.5">
          <span className="text-lg" aria-hidden="true">🔵</span>
          <span className="font-[family-name:var(--font-baloo)] font-semibold text-lg text-tata-ink">{left}</span>
          <span className="text-[10px] text-tata-ink-muted text-center leading-tight">Saíram</span>
        </div>
      </div>

      <div id="buscar">
        <h2 className="font-[family-name:var(--font-baloo)] font-semibold text-sm text-tata-ink mb-2.5">Crianças</h2>
        {rows.length === 0 ? (
          <EmptyState message="Nenhuma criança cadastrada ainda." withMascot />
        ) : (
          <ChildrenSearch rows={rows} checkInAction={checkInAction} checkOutAction={checkOutAction} />
        )}
      </div>
    </div>
  );
}
