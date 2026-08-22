import { prisma } from "@/lib/prisma";
import {
  MEAL_TYPE_LABELS,
  CONSUMPTION_LABELS,
  HYGIENE_TYPE_LABELS,
  ACTIVITY_CATEGORY_LABELS,
  MOOD_LABELS,
  INCIDENT_TYPE_LABELS,
  RELATIONSHIP_LABELS,
} from "@/lib/labels";

const relationshipLabel = (relationship: string | null) =>
  relationship ? RELATIONSHIP_LABELS[relationship] ?? relationship : null;

export type AuditEntry = {
  time: Date;
  actorName: string;
  childName: string | null;
  action: string;
};

const childLabel = (c: { fullName: string; preferredName: string | null }) => c.preferredName || c.fullName;

/**
 * Timeline operacional: registros de rotina (chegada/saída, alimentação, sono, higiene, humor, ocorrência,
 * medicamento, foto, atividade, pagamento, fechamento de mensalidade). É a "jornada" da criança, não uma
 * trilha de segurança — nunca inclui as entradas do AuditLog. Para auditoria administrativa, ver
 * `getAuditLogEntries`.
 */
export async function getOperationalTimeline(start: Date, end: Date, limit = 200): Promise<AuditEntry[]> {
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
      const relation = relationshipLabel(a.checkInPersonRelation);
      entries.push({
        time: a.checkInTime,
        actorName: a.checkInReceivedBy?.name ?? "—",
        childName: childLabel(a.child),
        action: `Registrou chegada. Levado por ${a.checkInPersonName}${relation ? ` — ${relation}` : ""}.`,
      });
    }
    if (a.checkOutTime && a.checkOutTime >= start && a.checkOutTime < end) {
      const relation = relationshipLabel(a.checkOutPersonRelation);
      entries.push({
        time: a.checkOutTime,
        actorName: a.checkOutReceivedBy?.name ?? "—",
        childName: childLabel(a.child),
        action: `Registrou saída. Retirado por ${a.checkOutPersonName}${relation ? ` — ${relation}` : ""}.`,
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

const currency = (n: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);

function describeAuditLog(entry: { entity: string; action: string; oldData: unknown; newData: unknown }) {
  const oldData = (entry.oldData ?? {}) as Record<string, unknown>;
  const newData = (entry.newData ?? {}) as Record<string, unknown>;

  switch (entry.entity) {
    case "Child":
      return `Cadastrou a criança ${newData.fullName ?? ""} — mensalidade ${currency(Number(newData.monthlyFee ?? 0))}.`;
    case "Guardian":
      return `Cadastrou o responsável ${newData.name ?? ""}${newData.portalAccessCreated ? " (com acesso ao portal)" : ""}.`;
    case "AuthorizedPickupPerson":
      if (entry.action === "CREATE") return `Cadastrou ${newData.name ?? ""} como pessoa autorizada a retirar.`;
      return `Alterou o status de uma pessoa autorizada de ${oldData.status ?? "?"} para ${newData.status ?? "?"}.`;
    case "MonthlyInvoice":
      if (entry.action === "ADJUSTMENT") {
        return `Lançou ${newData.type ?? "ajuste"} de ${currency(Number(newData.amount ?? 0))} — ${newData.description ?? ""}. Novo total: ${currency(Number(newData.totalAmount ?? 0))}.`;
      }
      if (entry.action === "CANCEL") return "Cancelou a cobrança.";
      return `Fechou a mensalidade de ${newData.referenceMonth}/${newData.referenceYear}: ${currency(Number(newData.totalAmount ?? 0))}.`;
    case "Payment":
      return `Registrou pagamento de ${currency(Number(newData.amount ?? 0))} (saldo: ${oldData.status ?? "?"} → ${newData.status ?? "?"}).`;
    case "User":
      return `Alterou o status da conta ${oldData.email ?? ""} de ${oldData.active ? "ativa" : "inativa"} para ${newData.active ? "ativa" : "inativa"}.`;
    default:
      return `${entry.action} em ${entry.entity}.`;
  }
}

/**
 * Auditoria de segurança: lê exclusivamente a tabela `AuditLog` (ver `src/lib/audit-log.ts`) — alterações
 * administrativas e financeiras sensíveis (cadastro/permissão, fechamento, pagamento, ajuste, cancelamento,
 * ativação de conta). Nunca inclui eventos de rotina — isso é a timeline operacional (`getOperationalTimeline`).
 */
export async function getAuditLogEntries(start: Date, end: Date): Promise<AuditEntry[]> {
  const logs = await prisma.auditLog.findMany({
    where: { createdAt: { gte: start, lt: end } },
    include: { actor: true },
    orderBy: { createdAt: "desc" },
  });
  if (logs.length === 0) return [];

  const childIds = new Set<string>();
  for (const log of logs) {
    if (log.entity === "Child") childIds.add(log.entityId);
    const data = { ...((log.oldData ?? {}) as Record<string, unknown>), ...((log.newData ?? {}) as Record<string, unknown>) };
    if (typeof data.childId === "string") childIds.add(data.childId);
  }
  const children = await prisma.child.findMany({
    where: { id: { in: [...childIds] } },
    select: { id: true, fullName: true, preferredName: true },
  });
  const childNameById = new Map(children.map((c) => [c.id, childLabel(c)]));

  return logs.map((log) => {
    const data = { ...((log.oldData ?? {}) as Record<string, unknown>), ...((log.newData ?? {}) as Record<string, unknown>) };
    const childId = log.entity === "Child" ? log.entityId : typeof data.childId === "string" ? data.childId : null;
    return {
      time: log.createdAt,
      actorName: log.actor.name,
      childName: childId ? childNameById.get(childId) ?? null : null,
      action: describeAuditLog(log),
    };
  });
}
