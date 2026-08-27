import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireGuardian, pickChildLink } from "@/lib/guardian";
import { todayDateOnly, todayRange, formatTime, formatDuration } from "@/lib/date";
import { buildTimeline } from "@/lib/journey";
import { RELATIONSHIP_LABELS, MEAL_TYPE_LABELS } from "@/lib/labels";
import { Card } from "@/components/tata/Card";
import { SectionHeader } from "@/components/tata/SectionHeader";
import { EmptyState } from "@/components/tata/EmptyState";
import { ChildSwitcher } from "./ChildSwitcher";
import { GuardianStatusBadge, type ChildPresenceStatus } from "./GuardianStatusBadge";

function greeting(hour: number) {
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

// Frases não repetem literalmente o texto do GuardianStatusBadge ("Na Turminha da Tata") para não colidir
// com seletores de teste que buscam esse texto exato no badge.
const STATUS_MESSAGE: Record<ChildPresenceStatus, (name: string) => string> = {
  waiting: (name) => `${name} ainda não chegou hoje.`,
  present: (name) => `${name} está bem cuidada por aqui 💛`,
  left: (name) => `${name} já foi para casa hoje.`,
};

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
    return (
      <div className="p-4 sm:p-6">
        <EmptyState message="Nenhuma criança vinculada à sua conta ainda. Assim que a escola confirmar seu cadastro, ela aparece por aqui 💛" withMascot />
      </div>
    );
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

  const childName = child.preferredName || child.fullName;

  return (
    <div className="flex flex-col gap-5 max-w-2xl mx-auto">
      {/* Hero emocional — a criança é a protagonista, não a lista de menus. Blob sutil no fundo em vez de
          branco puro; nunca decorativo demais (opacidade baixa, atrás do conteúdo). */}
      <div className="relative overflow-hidden bg-tata-green px-4 sm:px-6 pt-6 pb-8 rounded-b-tata-xl">
        <div className="tata-blob w-40 h-40 bg-tata-yellow -top-10 -right-10" aria-hidden="true" />
        <div className="tata-blob w-28 h-28 bg-tata-coral bottom-0 left-6" aria-hidden="true" />
        <div className="relative flex flex-col gap-3">
          <div>
            <h1 className="font-[family-name:var(--font-baloo)] font-semibold text-xl text-white">
              {greeting(now.getHours())}, {guardian.name.split(" ")[0]}! ☀️
            </h1>
            <p className="text-sm text-white/85">Veja como está sendo o dia de {childName}.</p>
          </div>

          <div className="flex items-center justify-between gap-2 bg-white/15 rounded-tata-lg px-4 py-3">
            <span className="font-[family-name:var(--font-baloo)] font-semibold text-white">{childName}</span>
            <GuardianStatusBadge status={status} />
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 flex flex-col gap-5 pb-2">
        <ChildSwitcher basePath="/pais" activeChildId={link.childId} guardianChildren={guardian.children} />

        <Card animate>
          <p className="text-sm text-tata-ink-soft">{STATUS_MESSAGE[status](childName)}</p>
          {arrived && (
            <p className="text-sm text-tata-ink-soft mt-1">
              Chegou às <span className="font-semibold text-tata-ink">{formatTime(attendance!.checkInTime!)}</span>
              {attendance?.checkInPersonName && (
                <>
                  {" "}— quem trouxe:{" "}
                  <span className="font-semibold text-tata-ink">
                    {attendance.checkInPersonName}
                    {checkInRelation ? ` (${checkInRelation})` : ""}
                  </span>
                </>
              )}
            </p>
          )}
          {left && (
            <p className="text-sm text-tata-ink-soft mt-1">
              Saiu às <span className="font-semibold text-tata-ink">{formatTime(attendance!.checkOutTime!)}</span>
              {attendance?.checkOutPersonName && (
                <>
                  {" "}— quem buscou:{" "}
                  <span className="font-semibold text-tata-ink">
                    {attendance.checkOutPersonName}
                    {checkOutRelation ? ` (${checkOutRelation})` : ""}
                  </span>
                </>
              )}
            </p>
          )}
        </Card>

        {link.viewRoutine && (
          <Card accent="yellow" animate className="flex flex-col gap-3">
            <SectionHeader icon="📋" title="Resumo de hoje" />
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-tata-ink-muted block">🍎 Alimentação</span>
                <span className="font-semibold text-tata-ink">{mealCount} registro{mealCount === 1 ? "" : "s"}</span>
              </div>
              <div>
                <span className="text-tata-ink-muted block">😴 Sono</span>
                <span className="font-semibold text-tata-ink">
                  {sleepMinutes > 0 ? formatDuration(0, sleepMinutes * 60000) : "Sem registro"}
                </span>
              </div>
              <div>
                <span className="text-tata-ink-muted block">🧼 Higiene</span>
                <span className="font-semibold text-tata-ink">{hygieneCount} registro{hygieneCount === 1 ? "" : "s"}</span>
              </div>
              <div>
                <span className="text-tata-ink-muted block">🎨 Atividades</span>
                <span className="font-semibold text-tata-ink">{activityCount} registro{activityCount === 1 ? "" : "s"}</span>
              </div>
            </div>
            {lastMood && (
              <p className="text-sm text-tata-ink-soft">
                😊 Humor: <span className="font-semibold text-tata-ink">{lastMood}</span>
              </p>
            )}
          </Card>
        )}

        {link.viewRoutine && lastUpdate && (
          <Card accent="blue" animate className="flex flex-col gap-1">
            <SectionHeader icon="🔔" title="Última atualização" />
            <p className="text-sm text-tata-ink-soft">
              <span className="font-mono text-xs text-tata-ink-muted">{formatTime(lastUpdate.time)}</span>{" "}
              <span className="font-semibold text-tata-ink">{lastUpdate.label}</span> — {lastUpdate.detail}
            </p>
          </Card>
        )}

        {link.viewRoutine && (
          <Link
            href="/pais/jornada"
            className="min-h-11 flex items-center justify-center bg-tata-coral text-white rounded-tata-md font-[family-name:var(--font-baloo)] font-semibold text-sm shadow-tata-card transition-transform active:scale-[0.98]"
          >
            Ver rotina completa
          </Link>
        )}

        <div className="grid grid-cols-2 gap-3">
          {shortcuts.map((s) => (
            <Link
              key={s.href}
              href={s.href}
              className="min-h-16 flex items-center gap-2.5 bg-tata-surface rounded-tata-lg shadow-tata-card px-4 transition-shadow hover:shadow-tata-card-hover"
            >
              <span className="text-xl" aria-hidden="true">{s.icon}</span>
              <span className="text-sm font-semibold text-tata-ink">{s.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
