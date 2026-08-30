import { prisma } from "@/lib/prisma";
import { todayRange } from "@/lib/date";
import { calculateOvertimeForAttendance, effectiveStatus } from "@/lib/financial";
import { notifyAdmins } from "@/lib/notifications";
import type { MonthlyInvoice, Child } from "@prisma/client";

/** Creates an admin notification for each overdue invoice that doesn't already have one — checked by
 * entityId, so re-running on every dashboard load (force-dynamic) never duplicates. */
async function syncOverdueInvoiceNotifications(overdueInvoices: (MonthlyInvoice & { child: Child })[]) {
  if (overdueInvoices.length === 0) return;

  const existing = await prisma.adminNotification.findMany({
    where: { type: "INVOICE_OVERDUE", entityId: { in: overdueInvoices.map((inv) => inv.id) } },
    select: { entityId: true },
  });
  const notified = new Set(existing.map((n) => n.entityId));

  const toNotify = overdueInvoices.filter((inv) => !notified.has(inv.id));
  await Promise.all(
    toNotify.map((inv) =>
      notifyAdmins(
        "INVOICE_OVERDUE",
        "Mensalidade vencida",
        `${inv.child.preferredName || inv.child.fullName}: mensalidade de ${inv.referenceMonth}/${inv.referenceYear} está vencida.`,
        { entity: "MonthlyInvoice", entityId: inv.id }
      )
    )
  );
}

export async function getDashboardData() {
  const { start, end } = todayRange();
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 1);

  const [
    activeChildren,
    caregiverTeam,
    todayAttendances,
    occurrencesToday,
    mealsToday,
    sleepsToday,
    activitiesToday,
    hygieneToday,
    diaperToday,
    healthLogsToday,
    waterToday,
    photosToday,
    pendingInvoices,
    paymentsThisMonth,
    openIncidents,
    activeMedicationAuthorizations,
    todaysMedicationAdmins,
    monthAttendances,
    enrollmentRequests,
  ] = await Promise.all([
    prisma.child.findMany({ where: { status: "ACTIVE" } }),
    prisma.user.findMany({ where: { role: "CAREGIVER", active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.attendance.findMany({ where: { date: start } }),
    prisma.incident.count({ where: { time: { gte: start, lt: end } } }),
    prisma.mealRecord.count({ where: { time: { gte: start, lt: end } } }),
    prisma.sleepRecord.count({ where: { startTime: { gte: start, lt: end } } }),
    prisma.activity.count({ where: { date: start } }),
    prisma.hygieneRecord.count({ where: { time: { gte: start, lt: end } } }),
    prisma.hygieneRecord.count({ where: { time: { gte: start, lt: end }, type: "DIAPER_CHANGE" } }),
    prisma.healthLog.count({ where: { time: { gte: start, lt: end } } }),
    prisma.waterRecord.count({ where: { time: { gte: start, lt: end } } }),
    prisma.photo.count({ where: { takenAt: { gte: start, lt: end } } }),
    prisma.monthlyInvoice.findMany({
      where: { status: { in: ["PENDING", "PARTIALLY_PAID", "OVERDUE"] } },
      include: { child: true },
    }),
    prisma.payment.aggregate({
      _sum: { amount: true },
      where: { paidAt: { gte: monthStart, lt: monthEnd } },
    }),
    prisma.incident.findMany({
      where: { guardianNotifiedId: null },
      include: { child: true },
      orderBy: { time: "desc" },
      take: 10,
    }),
    prisma.medicationAuthorization.findMany({
      where: { active: true, status: "ACTIVE" },
      include: { child: true },
    }),
    prisma.medicationAdministration.findMany({
      where: { time: { gte: start, lt: end } },
      select: { authorizationId: true, childId: true },
    }),
    prisma.attendance.findMany({
      where: { date: { gte: monthStart, lt: monthEnd }, checkOutTime: { not: null } },
      include: { child: true },
    }),
    prisma.enrollmentRequest.findMany({
      where: {
        OR: [
          { status: { in: ["SUBMITTED", "UNDER_REVIEW"] } },
          { status: "APPROVED", reviewedAt: { gte: monthStart, lt: monthEnd } },
        ],
      },
      orderBy: { submittedAt: "desc" },
      select: { id: true, status: true, childFullName: true, childPreferredName: true, submittedAt: true, reviewedAt: true },
    }),
  ]);

  const attendanceByChild = new Map(todayAttendances.map((a) => [a.childId, a]));
  const arrivedToday = todayAttendances.filter((a) => a.checkInTime).length;
  const stillAtSchool = todayAttendances.filter((a) => a.checkInTime && !a.checkOutTime).length;
  const notArrivedYet = activeChildren.filter((c) => !attendanceByChild.get(c.id)?.checkInTime);

  const stillPresentChildren = activeChildren.filter((c) => {
    const a = attendanceByChild.get(c.id);
    return a?.checkInTime && !a.checkOutTime;
  });

  let overtimeAccumulated = 0;
  const overtimeByChild = new Map<string, number>();
  for (const a of monthAttendances) {
    if (!a.checkOutTime) continue;
    const { amount } = calculateOvertimeForAttendance(
      a.checkOutTime,
      a.child.contractedExitTime,
      a.child.toleranceMinutes,
      Number(a.child.overtimeHourRate)
    );
    overtimeAccumulated += amount;
    overtimeByChild.set(a.childId, (overtimeByChild.get(a.childId) ?? 0) + amount);
  }
  overtimeAccumulated = Math.round(overtimeAccumulated * 100) / 100;

  const overdueInvoices = pendingInvoices.filter((inv) => effectiveStatus(inv) === "OVERDUE");
  const pendingInvoicesTotal = pendingInvoices.reduce((sum, inv) => sum + Number(inv.totalAmount) - Number(inv.paidAmount), 0);

  await syncOverdueInvoiceNotifications(overdueInvoices);

  const administeredAuthIds = new Set(todaysMedicationAdmins.map((m) => m.authorizationId));
  const medicationsPending = activeMedicationAuthorizations.filter((m) => !administeredAuthIds.has(m.id));

  const flowHours = [6, 8, 10, 12, 14, 16, 18];
  const flow = flowHours.map((hour) => ({ label: `${String(hour).padStart(2, "0")}h`, entries: 0, exits: 0 }));
  const hourInSaoPaulo = (date: Date) => Number(new Intl.DateTimeFormat("en-US", { timeZone: "America/Sao_Paulo", hour: "2-digit", hourCycle: "h23" }).format(date));
  const flowIndex = (date: Date) => Math.max(0, Math.min(flow.length - 1, Math.floor((hourInSaoPaulo(date) - 6) / 2)));
  for (const attendance of todayAttendances) {
    if (attendance.checkInTime) flow[flowIndex(attendance.checkInTime)].entries += 1;
    if (attendance.checkOutTime) flow[flowIndex(attendance.checkOutTime)].exits += 1;
  }

  const pendingEnrollments = enrollmentRequests.filter((request) => request.status === "SUBMITTED");
  const underReviewEnrollments = enrollmentRequests.filter((request) => request.status === "UNDER_REVIEW");
  const approvedThisMonth = enrollmentRequests.filter((request) => request.status === "APPROVED").length;
  const newEnrollmentsToday = pendingEnrollments.filter((request) => request.submittedAt && request.submittedAt >= start && request.submittedAt < end).length;

  const childrenWithOvertime = Array.from(overtimeByChild.entries())
    .filter(([, amount]) => amount > 0)
    .map(([childId, amount]) => ({
      child: activeChildren.find((c) => c.id === childId),
      amount,
    }))
    .filter((e) => e.child)
    .sort((a, b) => b.amount - a.amount);

  return {
    indicators: {
      totalChildren: activeChildren.length,
      present: arrivedToday,
      notArrived: notArrivedYet.length,
      stillAtSchool,
      caregiversActive: caregiverTeam.length,
      entriesToday: arrivedToday,
      exitsToday: todayAttendances.filter((a) => a.checkOutTime).length,
      occurrencesToday,
      medicationsToday: todaysMedicationAdmins.length,
      overtimeAccumulated,
      pendingInvoicesCount: pendingInvoices.length,
      pendingInvoicesTotal: Math.round(pendingInvoicesTotal * 100) / 100,
      receivedThisMonth: Number(paymentsThisMonth._sum.amount ?? 0),
    },
    routine: {
      meals: mealsToday,
      sleeps: sleepsToday,
      activities: activitiesToday,
      hygiene: hygieneToday,
      diapers: diaperToday,
      observations: healthLogsToday,
      water: waterToday,
      photos: photosToday,
    },
    alerts: {
      notArrivedChildren: notArrivedYet,
      stillPresentChildren,
      medicationsPending,
      openIncidents,
      overdueInvoices,
      childrenWithOvertime,
    },
    operation: {
      flow,
      attentionCount: medicationsPending.length + openIncidents.length + overdueInvoices.length + pendingEnrollments.length,
    },
    enrollments: {
      newToday: newEnrollmentsToday,
      submitted: pendingEnrollments.length,
      underReview: underReviewEnrollments.length,
      approvedThisMonth,
      latest: enrollmentRequests[0] ?? null,
    },
    financial: {
      received: Number(paymentsThisMonth._sum.amount ?? 0),
      open: Math.round(pendingInvoicesTotal * 100) / 100,
      overdue: Math.round(overdueInvoices.reduce((sum, invoice) => sum + Number(invoice.totalAmount) - Number(invoice.paidAmount), 0) * 100) / 100,
      overdueCount: overdueInvoices.length,
    },
    medications: {
      authorized: activeMedicationAuthorizations.length,
      administered: todaysMedicationAdmins.length,
      pending: medicationsPending.length,
    },
    caregiverTeam,
  };
}
