import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireGuardian, pickChildLink } from "@/lib/guardian";
import { todayDateOnly, todayRange, formatTime, formatDuration } from "@/lib/date";
import { buildTimeline } from "@/lib/journey";
import { RELATIONSHIP_LABELS, MEAL_TYPE_LABELS } from "@/lib/labels";
import { ChildSwitcher } from "./ChildSwitcher";
import { GuardianStatusBadge, type ChildPresenceStatus } from "./GuardianStatusBadge";

function greeting(hour: number) {
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

const MEAL_LABELS = new Set<string>(Object.values(MEAL_TYPE_LABELS));

export default async function GuardianHomePage({
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

  const { start, end } = todayRange();
  const now = new Date();

  const [attendance, timeline, finishedSleeps] = await Promise.all([
    prisma.attendance.findFirst({ where: { childId: link.childId, date: todayDateOnly() } }),
    link.viewRoutine ? buildTimeline(link.childId, start, end) : Promise.resolve([]),
    prisma.sleepRecord.findMany({
      where: { childId: link.childId, startTime: { gte: start, lt: end }, endTime: { not: null } },
    }),
  ]);

  // Mesma regra de privacidade da jornada: foto só entra na timeline se a permissão de fotos também for concedida.
  const visibleTimeline = link.viewPhotos ? timeline : timeline.filter((e) => e.label !== "Foto");

  const child = link.child;
  const arrived = !!attendance?.checkInTime;
  const left = !!attendance?.checkOutTime;
  const status: ChildPresenceStatus = left ? "left" : arrived ? "present" : "waiting";

  const checkInRelation = attendance?.checkInPersonRelation
    ? RELATIONSHIP_LABELS[attendance.checkInPersonRelation] ?? attendance.checkInPersonRelation
    : null;
  const checkOutRelation = attendance?.checkOutPersonRelation
    ? RELATIONSHIP_LABELS[attendance.checkOutPersonRelation] ?? attendance.checkOutPersonRelation
    : null;

  const mealCount = visibleTimeline.filter((e) => MEAL_LABELS.has(e.label)).length;
  const hygieneCount = visibleTimeline.filter((e) => e.label === "Higiene").length;
  const activityCount = visibleTimeline.filter((e) => e.label === "Atividade").length;
  const lastMood = [...visibleTimeline].reverse().find((e) => e.label === "Humor")?.detail;
  const sleepMinutes = finishedSleeps.reduce((sum, s) => sum + (s.endTime!.getTime() - s.startTime.getTime()) / 60000, 0);
  const lastUpdate = visibleTimeline[visibleTimeline.length - 1];

  const shortcuts = [
    { href: "/pais/atividades", icon: "🎨", label: "Atividades" },
    { href: "/pais/comunicados", icon: "📣", label: "Comunicados" },
    { href: "/pais/agenda", icon: "📅", label: "Agenda" },
    { href: "/pais/notificacoes", icon: "🔔", label: "Notificações" },
  ];

  return (
    <div className="p-4 sm:p-6 flex flex-col gap-5 max-w-2xl mx-auto">
      <ChildSwitcher basePath="/pais" activeChildId={link.childId} guardianChildren={guardian.children} />

      <div>
        <h1 className="font-[family-name:var(--font-baloo)] font-semibold text-xl text-[#2E2418]">
          {greeting(now.getHours())}, {guardian.name.split(" ")[0]}! ☀️
        </h1>
        <p className="text-sm text-[#9A8A72]">
          {new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "long" }).format(now)}
        </p>
      </div>

      <div className="bg-[#FFFDF8] rounded-2xl shadow-sm p-5 flex flex-col gap-2.5">
        <div className="flex items-start justify-between gap-2">
          <span className="font-[family-name:var(--font-baloo)] font-semibold text-lg text-[#2E2418]">
            {child.preferredName || child.fullName}
          </span>
          <GuardianStatusBadge status={status} />
        </div>

        {arrived && (
          <p className="text-sm text-[#6B5D4A]">
            Chegou às <span className="font-semibold text-[#2E2418]">{formatTime(attendance!.checkInTime!)}</span>
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
        {left && (
          <p className="text-sm text-[#6B5D4A]">
            Saiu às <span className="font-semibold text-[#2E2418]">{formatTime(attendance!.checkOutTime!)}</span>
            {attendance?.checkOutPersonName && (
              <>
                {" "}— quem buscou:{" "}
                <span className="font-semibold text-[#2E2418]">
                  {attendance.checkOutPersonName}
                  {checkOutRelation ? ` (${checkOutRelation})` : ""}
                </span>
              </>
            )}
          </p>
        )}
        {!arrived && <p className="text-sm text-[#8A7A62]">Ainda não chegou à Turminha da Tata hoje.</p>}
      </div>

      {link.viewRoutine && (
        <div className="bg-[#FFFDF8] rounded-2xl shadow-sm p-5 flex flex-col gap-3">
          <span className="font-[family-name:var(--font-baloo)] font-semibold text-sm text-[#2E2418]">
            📋 Resumo de hoje
          </span>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-[#9A8A72] block">🍎 Alimentação</span>
              <span className="font-semibold text-[#2E2418]">{mealCount} registro{mealCount === 1 ? "" : "s"}</span>
            </div>
            <div>
              <span className="text-[#9A8A72] block">😴 Sono</span>
              <span className="font-semibold text-[#2E2418]">
                {sleepMinutes > 0 ? formatDuration(0, sleepMinutes * 60000) : "Sem registro"}
              </span>
            </div>
            <div>
              <span className="text-[#9A8A72] block">🧼 Higiene</span>
              <span className="font-semibold text-[#2E2418]">{hygieneCount} registro{hygieneCount === 1 ? "" : "s"}</span>
            </div>
            <div>
              <span className="text-[#9A8A72] block">🎨 Atividades</span>
              <span className="font-semibold text-[#2E2418]">{activityCount} registro{activityCount === 1 ? "" : "s"}</span>
            </div>
          </div>
          {lastMood && (
            <p className="text-sm text-[#6B5D4A]">
              😊 Humor: <span className="font-semibold text-[#2E2418]">{lastMood}</span>
            </p>
          )}
        </div>
      )}

      {link.viewRoutine && lastUpdate && (
        <div className="bg-[#FFFDF8] rounded-2xl shadow-sm p-5 flex flex-col gap-1">
          <span className="font-[family-name:var(--font-baloo)] font-semibold text-sm text-[#2E2418]">
            🔔 Última atualização
          </span>
          <p className="text-sm text-[#6B5D4A]">
            <span className="font-mono text-xs text-[#9A8A72]">{formatTime(lastUpdate.time)}</span>{" "}
            <span className="font-semibold text-[#2E2418]">{lastUpdate.label}</span> — {lastUpdate.detail}
          </p>
        </div>
      )}

      {link.viewRoutine && (
        <Link
          href="/pais/jornada"
          className="min-h-11 flex items-center justify-center bg-[#1FA787] text-white rounded-xl font-[family-name:var(--font-baloo)] font-semibold text-sm"
        >
          Ver rotina completa
        </Link>
      )}

      <div className="grid grid-cols-2 gap-3">
        {shortcuts.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="min-h-16 flex items-center gap-2.5 bg-[#FFFDF8] rounded-2xl shadow-sm px-4"
          >
            <span className="text-xl" aria-hidden="true">{s.icon}</span>
            <span className="text-sm font-semibold text-[#2E2418]">{s.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
