import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { todayRange, formatTime } from "@/lib/date";

/**
 * Três consultas leves e diretas, sem reaproveitar getDashboardData() (src/lib/dashboard.ts) — aquela função
 * também agrega financeiro/horas excedentes do mês inteiro, que não é assunto da cuidadora (menor privilégio).
 */
export default async function CaregiverAlertsPage() {
  const { start, end } = todayRange();

  const [notArrivedChildren, openIncidents, activeAuthorizations, administeredToday] = await Promise.all([
    prisma.child.findMany({
      where: { status: "ACTIVE", attendances: { none: { date: start, checkInTime: { not: null } } } },
      orderBy: { fullName: "asc" },
    }),
    prisma.incident.findMany({
      where: { time: { gte: start, lt: end }, guardianNotifiedId: null },
      include: { child: true },
      orderBy: { time: "desc" },
    }),
    prisma.medicationAuthorization.findMany({
      where: { active: true },
      include: { child: true },
    }),
    prisma.medicationAdministration.findMany({
      where: { time: { gte: start, lt: end } },
      select: { authorizationId: true },
    }),
  ]);

  const administeredIds = new Set(administeredToday.map((a) => a.authorizationId));
  const medicationsPending = activeAuthorizations.filter((m) => !administeredIds.has(m.id));

  return (
    <div className="p-4 sm:p-6 flex flex-col gap-5 max-w-2xl mx-auto">
      <h1 className="font-[family-name:var(--font-baloo)] font-semibold text-xl text-[#2E2418]">Alertas</h1>

      <section className="flex flex-col gap-2.5">
        <h2 className="font-[family-name:var(--font-baloo)] font-semibold text-sm text-[#2E2418]">
          💊 Medicamentos pendentes hoje
        </h2>
        {medicationsPending.length === 0 ? (
          <p className="text-sm text-[#8A7A62]">Nenhum medicamento previsto.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {medicationsPending.map((m) => (
              <Link
                key={m.id}
                href={`/cuidadora/criancas/${m.childId}`}
                className="bg-[#FFFDF8] rounded-2xl shadow-sm p-4 flex flex-col gap-0.5 min-h-11"
              >
                <span className="font-semibold text-[#2E2418] text-sm">
                  {m.child.preferredName || m.child.fullName} — {m.medication}
                </span>
                <span className="text-xs text-[#9A8A72]">
                  {m.dosage}
                  {m.scheduleTime ? ` — previsto ${m.scheduleTime}` : ""}
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-2.5">
        <h2 className="font-[family-name:var(--font-baloo)] font-semibold text-sm text-[#2E2418]">
          ⚠️ Ocorrências em aberto
        </h2>
        {openIncidents.length === 0 ? (
          <p className="text-sm text-[#8A7A62]">Nenhuma ocorrência registrada hoje.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {openIncidents.map((inc) => (
              <Link
                key={inc.id}
                href={`/cuidadora/criancas/${inc.childId}`}
                className="bg-[#FFFDF8] rounded-2xl shadow-sm p-4 flex flex-col gap-0.5 min-h-11"
              >
                <span className="font-semibold text-[#2E2418] text-sm">
                  {inc.child.preferredName || inc.child.fullName} — {formatTime(inc.time)}
                </span>
                <span className="text-xs text-[#9A8A72]">{inc.description}</span>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-2.5">
        <h2 className="font-[family-name:var(--font-baloo)] font-semibold text-sm text-[#2E2418]">
          🟡 Ainda não chegaram
        </h2>
        {notArrivedChildren.length === 0 ? (
          <p className="text-sm text-[#8A7A62]">Todas as crianças ativas já chegaram.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {notArrivedChildren.map((c) => (
              <Link
                key={c.id}
                href={`/cuidadora/criancas/${c.id}`}
                className="min-h-11 flex items-center bg-[#FFFDF8] rounded-full shadow-sm px-4 text-sm font-semibold text-[#2E2418]"
              >
                {c.preferredName || c.fullName}
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
