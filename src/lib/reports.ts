import { prisma } from "@/lib/prisma";
import { calculateOvertimeForAttendance, effectiveStatus } from "@/lib/financial";

const childLabel = (c: { fullName: string; preferredName: string | null }) => c.preferredName || c.fullName;

export async function getChildrenReport(start: Date, end: Date) {
  const children = await prisma.child.findMany({
    orderBy: { fullName: "asc" },
    include: {
      attendances: { where: { date: { gte: start, lt: end } } },
    },
  });

  return children.map((child) => {
    const attendances = child.attendances;
    const entries = attendances.filter((a) => a.checkInTime).length;
    const exits = attendances.filter((a) => a.checkOutTime).length;
    const totalMinutesPresent = attendances.reduce((sum, a) => {
      if (a.checkInTime && a.checkOutTime) {
        return sum + Math.round((a.checkOutTime.getTime() - a.checkInTime.getTime()) / 60000);
      }
      return sum;
    }, 0);

    return {
      child,
      status: child.status,
      frequency: attendances.length,
      entries,
      exits,
      avgMinutesPresent: entries > 0 ? Math.round(totalMinutesPresent / entries) : 0,
    };
  });
}

export async function getRoutineReport(start: Date, end: Date) {
  const [meals, sleeps, hygiene, activities, moods, observations] = await Promise.all([
    prisma.mealRecord.groupBy({ by: ["mealType", "consumption"], where: { time: { gte: start, lt: end } }, _count: true }),
    prisma.sleepRecord.findMany({ where: { startTime: { gte: start, lt: end } } }),
    prisma.hygieneRecord.groupBy({ by: ["type"], where: { time: { gte: start, lt: end } }, _count: true }),
    prisma.activity.groupBy({ by: ["category"], where: { time: { gte: start, lt: end } }, _count: true }),
    prisma.moodRecord.groupBy({ by: ["mood"], where: { time: { gte: start, lt: end } }, _count: true }),
    prisma.healthLog.count({ where: { time: { gte: start, lt: end } } }),
  ]);

  const sleepDurations = sleeps.filter((s) => s.endTime).map((s) => (s.endTime!.getTime() - s.startTime.getTime()) / 60000);
  const avgSleepMinutes =
    sleepDurations.length > 0 ? Math.round(sleepDurations.reduce((a, b) => a + b, 0) / sleepDurations.length) : 0;

  return {
    meals,
    sleepCount: sleeps.length,
    avgSleepMinutes,
    hygiene,
    activities,
    moods,
    observations,
  };
}

export async function getSecurityReport(start: Date, end: Date) {
  const attendances = await prisma.attendance.findMany({
    where: { OR: [{ checkInTime: { gte: start, lt: end } }, { checkOutTime: { gte: start, lt: end } }] },
    include: { child: true },
  });

  const pickupPeople = new Map<string, { name: string; relation: string; count: number }>();
  for (const a of attendances) {
    if (a.checkOutPersonName) {
      const key = `${a.checkOutPersonName}|${a.checkOutPersonRelation ?? ""}`;
      const existing = pickupPeople.get(key);
      pickupPeople.set(key, {
        name: a.checkOutPersonName,
        relation: a.checkOutPersonRelation ?? "",
        count: (existing?.count ?? 0) + 1,
      });
    }
  }

  const incidents = await prisma.incident.findMany({
    where: { time: { gte: start, lt: end } },
    include: { child: true },
    orderBy: { time: "desc" },
  });

  return {
    entries: attendances.filter((a) => a.checkInTime && a.checkInTime >= start && a.checkInTime < end).length,
    exits: attendances.filter((a) => a.checkOutTime && a.checkOutTime >= start && a.checkOutTime < end).length,
    pickupPeople: Array.from(pickupPeople.values()).sort((a, b) => b.count - a.count),
    incidents,
  };
}

export async function getFinancialReport(start: Date, end: Date) {
  const [invoices, payments, overdueInvoices, attendancesWithCheckout] = await Promise.all([
    prisma.monthlyInvoice.findMany({ where: { createdAt: { gte: start, lt: end } }, include: { child: true } }),
    prisma.payment.aggregate({ _sum: { amount: true }, where: { paidAt: { gte: start, lt: end } } }),
    prisma.monthlyInvoice.findMany({
      where: { status: { in: ["PENDING", "PARTIALLY_PAID", "OVERDUE"] } },
      include: { child: true },
    }),
    prisma.attendance.findMany({
      where: { date: { gte: start, lt: end }, checkOutTime: { not: null } },
      include: { child: true },
    }),
  ]);

  let overtimeTotal = 0;
  for (const a of attendancesWithCheckout) {
    if (!a.checkOutTime) continue;
    const { amount } = calculateOvertimeForAttendance(
      a.checkOutTime,
      a.child.contractedExitTime,
      a.child.toleranceMinutes,
      Number(a.child.overtimeHourRate)
    );
    overtimeTotal += amount;
  }

  const delinquent = overdueInvoices.filter((inv) => effectiveStatus(inv) === "OVERDUE");
  const billing = invoices.reduce((sum, inv) => sum + Number(inv.totalAmount), 0);

  return {
    invoicesIssued: invoices.length,
    billing: Math.round(billing * 100) / 100,
    received: Number(payments._sum.amount ?? 0),
    overtimeTotal: Math.round(overtimeTotal * 100) / 100,
    delinquent,
  };
}

export { childLabel };
