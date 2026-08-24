import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { todayDateOnly, todayRange, formatTime } from "@/lib/date";
import { MEAL_TYPE_LABELS, MOOD_LABELS } from "@/lib/labels";

export default async function AdminRoutinePage() {
  const date = todayDateOnly();
  const { start, end } = todayRange();

  const [children, meals, sleeps, activities, moods] = await Promise.all([
    prisma.child.findMany({
      where: { status: "ACTIVE" },
      orderBy: { fullName: "asc" },
      include: { attendances: { where: { date } } },
    }),
    prisma.mealRecord.findMany({ where: { time: { gte: start, lt: end } }, orderBy: { time: "desc" } }),
    prisma.sleepRecord.findMany({ where: { startTime: { gte: start, lt: end } }, orderBy: { startTime: "desc" } }),
    prisma.activityChild.findMany({
      where: { activity: { date } },
      include: { activity: true },
      orderBy: { activity: { time: "desc" } },
    }),
    prisma.moodRecord.findMany({ where: { time: { gte: start, lt: end } }, orderBy: { time: "desc" } }),
  ]);

  const latestByChild = <T extends { childId: string }>(records: T[]) => {
    const map = new Map<string, T>();
    for (const r of records) if (!map.has(r.childId)) map.set(r.childId, r);
    return map;
  };

  const lastMeal = latestByChild(meals);
  const lastSleep = latestByChild(sleeps);
  const lastMood = latestByChild(moods);
  const lastActivity = new Map<string, (typeof activities)[number]>();
  for (const a of activities) if (!lastActivity.has(a.childId)) lastActivity.set(a.childId, a);

  return (
    <div className="p-4 sm:p-8 flex flex-col gap-6">
      <div>
        <h1 className="font-[family-name:var(--font-baloo)] font-semibold text-xl text-tata-ink">
          Rotina de hoje
        </h1>
        <p className="text-sm text-tata-ink-muted-alt">
          {new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "long", year: "numeric" }).format(new Date())}
        </p>
      </div>

      {children.length === 0 ? (
        <div className="bg-tata-surface rounded-2xl shadow-sm p-8 text-center text-sm text-tata-ink-muted-alt">
          Nenhuma criança ativa cadastrada.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {children.map((child) => {
            const attendance = child.attendances[0];
            const status = attendance?.checkOutTime ? "Saiu" : attendance?.checkInTime ? "Presente" : "Aguardando chegada";
            const statusClass = attendance?.checkOutTime
              ? "bg-tata-blue/10 text-tata-blue-dark"
              : attendance?.checkInTime
                ? "bg-tata-green/10 text-tata-green-dark"
                : "bg-tata-yellow/10 text-tata-yellow-dark";

            const meal = lastMeal.get(child.id);
            const sleep = lastSleep.get(child.id);
            const mood = lastMood.get(child.id);
            const activity = lastActivity.get(child.id);

            return (
              <Link
                key={child.id}
                href={`/admin/criancas/${child.id}`}
                className="bg-tata-surface rounded-2xl shadow-sm p-4 flex flex-col gap-2"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-tata-ink text-sm">{child.preferredName || child.fullName}</span>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusClass}`}>{status}</span>
                </div>
                <div className="flex flex-col gap-1 text-xs text-tata-ink-soft">
                  {attendance?.checkInTime && <p>Chegada: {formatTime(attendance.checkInTime)}</p>}
                  {meal && <p>Última refeição: {MEAL_TYPE_LABELS[meal.mealType]} — {formatTime(meal.time)}</p>}
                  {sleep && (
                    <p>Soneca: {sleep.endTime ? `até ${formatTime(sleep.endTime)}` : "em andamento"}</p>
                  )}
                  {mood && <p>Humor: {MOOD_LABELS[mood.mood]}</p>}
                  {activity && <p>Última atividade: {formatTime(activity.activity.time)}</p>}
                  {!meal && !sleep && !mood && !activity && (
                    <p className="text-tata-ink-muted">Nenhum registro de rotina ainda hoje.</p>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
