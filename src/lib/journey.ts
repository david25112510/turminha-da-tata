import { prisma } from "@/lib/prisma";
import { formatTime, formatDuration } from "@/lib/date";
import {
  MEAL_TYPE_LABELS,
  CONSUMPTION_LABELS,
  HYGIENE_TYPE_LABELS,
  WATER_AMOUNT_LABELS,
  ACTIVITY_CATEGORY_LABELS,
  MOOD_LABELS,
  INCIDENT_TYPE_LABELS,
  RELATIONSHIP_LABELS,
} from "@/lib/labels";

const relationshipLabel = (relationship: string | null) =>
  relationship ? RELATIONSHIP_LABELS[relationship] ?? relationship : null;

export type TimelineEntry = { time: Date; label: string; detail: string };

export async function buildTimeline(childId: string, start: Date, end: Date): Promise<TimelineEntry[]> {
  const [attendance, meals, sleeps, hygiene, waters, moods, healthLogs, incidents, medicationAdmins, activityLinks, photos] =
    await Promise.all([
      prisma.attendance.findFirst({ where: { childId, date: start } }),
      prisma.mealRecord.findMany({ where: { childId, time: { gte: start, lt: end } } }),
      prisma.sleepRecord.findMany({ where: { childId, startTime: { gte: start, lt: end } } }),
      prisma.hygieneRecord.findMany({ where: { childId, time: { gte: start, lt: end } } }),
      prisma.waterRecord.findMany({ where: { childId, time: { gte: start, lt: end } } }),
      prisma.moodRecord.findMany({ where: { childId, time: { gte: start, lt: end } } }),
      prisma.healthLog.findMany({ where: { childId, time: { gte: start, lt: end } } }),
      prisma.incident.findMany({ where: { childId, time: { gte: start, lt: end } } }),
      prisma.medicationAdministration.findMany({
        where: { childId, time: { gte: start, lt: end } },
        include: { authorization: true },
      }),
      prisma.activityChild.findMany({
        where: { childId, activity: { date: start } },
        include: { activity: true },
      }),
      prisma.photo.findMany({ where: { childId, takenAt: { gte: start, lt: end } } }),
    ]);

  const timeline: TimelineEntry[] = [];

  if (attendance?.checkInTime) {
    const relation = relationshipLabel(attendance.checkInPersonRelation);
    timeline.push({
      time: attendance.checkInTime,
      label: "Chegada",
      detail: `Levado por ${attendance.checkInPersonName}${relation ? ` — ${relation}` : ""}`,
    });
  }
  if (attendance?.checkOutTime) {
    const relation = relationshipLabel(attendance.checkOutPersonRelation);
    timeline.push({
      time: attendance.checkOutTime,
      label: "Saída",
      detail: `Retirado por ${attendance.checkOutPersonName}${relation ? ` — ${relation}` : ""}`,
    });
  }
  for (const m of meals) {
    timeline.push({ time: m.time, label: MEAL_TYPE_LABELS[m.mealType], detail: CONSUMPTION_LABELS[m.consumption] });
  }
  for (const s of sleeps) {
    timeline.push({
      time: s.startTime,
      label: "Soneca",
      detail: s.endTime
        ? `${formatTime(s.startTime)} → ${formatTime(s.endTime)} (${formatDuration(s.startTime.getTime(), s.endTime.getTime())})`
        : "Em andamento",
    });
  }
  for (const h of hygiene) {
    timeline.push({ time: h.time, label: "Higiene", detail: HYGIENE_TYPE_LABELS[h.type] });
  }
  for (const w of waters) {
    timeline.push({ time: w.time, label: "Água", detail: WATER_AMOUNT_LABELS[w.amount] });
  }
  for (const mo of moods) {
    timeline.push({ time: mo.time, label: "Humor", detail: MOOD_LABELS[mo.mood] });
  }
  for (const hl of healthLogs) {
    timeline.push({
      time: hl.time,
      label: "Saúde",
      detail: [hl.temperature ? `${hl.temperature}°C` : null, hl.symptoms].filter(Boolean).join(" — ") || "Registro",
    });
  }
  for (const inc of incidents) {
    timeline.push({ time: inc.time, label: "Ocorrência", detail: `${INCIDENT_TYPE_LABELS[inc.type]}: ${inc.description}` });
  }
  for (const md of medicationAdmins) {
    timeline.push({ time: md.time, label: "Medicamento", detail: `${md.authorization.medication} — administrado` });
  }
  for (const al of activityLinks) {
    timeline.push({ time: al.activity.time, label: "Atividade", detail: ACTIVITY_CATEGORY_LABELS[al.activity.category] });
  }
  for (const p of photos) {
    timeline.push({ time: p.takenAt, label: "Foto", detail: p.caption || "Registrada" });
  }

  timeline.sort((a, b) => a.time.getTime() - b.time.getTime());
  return timeline;
}
