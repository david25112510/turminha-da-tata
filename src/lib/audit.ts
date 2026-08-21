import { prisma } from "@/lib/prisma";
import {
  MEAL_TYPE_LABELS,
  CONSUMPTION_LABELS,
  HYGIENE_TYPE_LABELS,
  ACTIVITY_CATEGORY_LABELS,
  MOOD_LABELS,
  INCIDENT_TYPE_LABELS,
} from "@/lib/labels";

export type AuditEntry = {
  time: Date;
  actorName: string;
  childName: string | null;
  action: string;
};

const childLabel = (c: { fullName: string; preferredName: string | null }) => c.preferredName || c.fullName;

export async function getRecentActivity(start: Date, end: Date, limit = 200): Promise<AuditEntry[]> {
  const [
    attendances,
    meals,
    sleeps,
    hygiene,
    moods,
    healthLogs,
    incidents,
    medicationAdmins,
    photos,
    activities,
    payments,
    invoices,
  ] = await Promise.all([
    prisma.attendance.findMany({
      where: { OR: [{ checkInTime: { gte: start, lt: end } }, { checkOutTime: { gte: start, lt: end } }] },
      include: { child: true, checkInReceivedBy: true, checkOutReceivedBy: true },
    }),
    prisma.mealRecord.findMany({ where: { time: { gte: start, lt: end } }, include: { child: true, recordedBy: true } }),
    prisma.sleepRecord.findMany({
      where: { OR: [{ startTime: { gte: start, lt: end } }, { endTime: { gte: start, lt: end } }] },
      include: { child: true, startedBy: true, endedBy: true },
    }),
    prisma.hygieneRecord.findMany({ where: { time: { gte: start, lt: end } }, include: { child: true, recordedBy: true } }),
    prisma.moodRecord.findMany({ where: { time: { gte: start, lt: end } }, include: { child: true, recordedBy: true } }),
    prisma.healthLog.findMany({ where: { time: { gte: start, lt: end } }, include: { child: true, recordedBy: true } }),
    prisma.incident.findMany({ where: { time: { gte: start, lt: end } }, include: { child: true, recordedBy: true } }),
    prisma.medicationAdministration.findMany({
      where: { time: { gte: start, lt: end } },
      include: { child: true, administeredBy: true, authorization: true },
    }),
    prisma.photo.findMany({ where: { takenAt: { gte: start, lt: end } }, include: { child: true, uploadedBy: true } }),
    prisma.activity.findMany({
      where: { time: { gte: start, lt: end } },
      include: { recordedBy: true, children: { include: { child: true } } },
    }),
    prisma.payment.findMany({
      where: { paidAt: { gte: start, lt: end } },
      include: { recordedBy: true, invoice: { include: { child: true } } },
    }),
    prisma.monthlyInvoice.findMany({
      where: { createdAt: { gte: start, lt: end } },
      include: { child: true },
    }),
  ]);

  const entries: AuditEntry[] = [];

  for (const a of attendances) {
    if (a.checkInTime && a.checkInTime >= start && a.checkInTime < end) {
      entries.push({
        time: a.checkInTime,
        actorName: a.checkInReceivedBy?.name ?? "—",
        childName: childLabel(a.child),
        action: `Registrou chegada. Levado por ${a.checkInPersonName}${a.checkInPersonRelation ? ` — ${a.checkInPersonRelation}` : ""}.`,
      });
    }
    if (a.checkOutTime && a.checkOutTime >= start && a.checkOutTime < end) {
      entries.push({
        time: a.checkOutTime,
        actorName: a.checkOutReceivedBy?.name ?? "—",
        childName: childLabel(a.child),
        action: `Registrou saída. Retirado por ${a.checkOutPersonName}${a.checkOutPersonRelation ? ` — ${a.checkOutPersonRelation}` : ""}.`,
      });
    }
  }

  for (const m of meals) {
    entries.push({
      time: m.time,
      actorName: m.recordedBy.name,
      childName: childLabel(m.child),
      action: `Registrou alimentação: ${MEAL_TYPE_LABELS[m.mealType]} — ${CONSUMPTION_LABELS[m.consumption]}.`,
    });
  }

  for (const s of sleeps) {
    if (s.startTime >= start && s.startTime < end) {
      entries.push({ time: s.startTime, actorName: s.startedBy.name, childName: childLabel(s.child), action: "Iniciou soneca." });
    }
    if (s.endTime && s.endTime >= start && s.endTime < end) {
      entries.push({ time: s.endTime, actorName: s.endedBy?.name ?? "—", childName: childLabel(s.child), action: "Finalizou soneca." });
    }
  }

  for (const h of hygiene) {
    entries.push({ time: h.time, actorName: h.recordedBy.name, childName: childLabel(h.child), action: `Registrou higiene: ${HYGIENE_TYPE_LABELS[h.type]}.` });
  }

  for (const mo of moods) {
    entries.push({ time: mo.time, actorName: mo.recordedBy.name, childName: childLabel(mo.child), action: `Registrou humor: ${MOOD_LABELS[mo.mood]}.` });
  }

  for (const hl of healthLogs) {
    entries.push({ time: hl.time, actorName: hl.recordedBy.name, childName: childLabel(hl.child), action: "Registrou observação de saúde." });
  }

  for (const inc of incidents) {
    entries.push({
      time: inc.time,
      actorName: inc.recordedBy.name,
      childName: childLabel(inc.child),
      action: `Registrou ocorrência: ${INCIDENT_TYPE_LABELS[inc.type]}.`,
    });
  }

  for (const md of medicationAdmins) {
    entries.push({
      time: md.time,
      actorName: md.administeredBy.name,
      childName: childLabel(md.child),
      action: `Confirmou administração de ${md.authorization.medication}.`,
    });
  }

  for (const p of photos) {
    entries.push({ time: p.takenAt, actorName: p.uploadedBy.name, childName: childLabel(p.child), action: "Publicou uma foto." });
  }

  for (const act of activities) {
    const names = act.children.map((c) => childLabel(c.child)).join(", ");
    entries.push({
      time: act.time,
      actorName: act.recordedBy.name,
      childName: names || null,
      action: `Registrou atividade: ${ACTIVITY_CATEGORY_LABELS[act.category]}.`,
    });
  }

  for (const pay of payments) {
    entries.push({
      time: pay.paidAt,
      actorName: pay.recordedBy.name,
      childName: childLabel(pay.invoice.child),
      action: `Registrou pagamento de ${new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(pay.amount))}.`,
    });
  }

  for (const inv of invoices) {
    entries.push({
      time: inv.createdAt,
      actorName: "Sistema",
      childName: childLabel(inv.child),
      action: `Fechou a mensalidade de ${inv.referenceMonth}/${inv.referenceYear}.`,
    });
  }

  entries.sort((a, b) => b.time.getTime() - a.time.getTime());
  return entries.slice(0, limit);
}
