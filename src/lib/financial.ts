import { prisma } from "@/lib/prisma";
import type { InvoiceStatus, MonthlyInvoice } from "@prisma/client";

export function calculateOvertimeForAttendance(
  checkOutTime: Date,
  contractedExitTime: string,
  toleranceMinutes: number,
  overtimeHourRate: number
): { minutesLate: number; amount: number } {
  const [hours, minutes] = contractedExitTime.split(":").map(Number);
  const expected = new Date(checkOutTime);
  expected.setHours(hours, minutes, 0, 0);

  const diffMinutes = Math.round((checkOutTime.getTime() - expected.getTime()) / 60000);
  if (diffMinutes <= toleranceMinutes) {
    return { minutesLate: 0, amount: 0 };
  }

  const perMinuteRate = overtimeHourRate / 60;
  const amount = Math.round(diffMinutes * perMinuteRate * 100) / 100;
  return { minutesLate: diffMinutes, amount };
}

export type OvertimeEntry = { date: Date; minutesLate: number; amount: number };

export async function getMonthlyOvertimeBreakdown(childId: string, month: number, year: number) {
  const child = await prisma.child.findUniqueOrThrow({ where: { id: childId } });
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1);

  const attendances = await prisma.attendance.findMany({
    where: { childId, date: { gte: start, lt: end }, checkOutTime: { not: null } },
    orderBy: { date: "asc" },
  });

  const overtimeRate = Number(child.overtimeHourRate);
  const entries: OvertimeEntry[] = attendances
    .map((a) => {
      const { minutesLate, amount } = calculateOvertimeForAttendance(
        a.checkOutTime!,
        child.contractedExitTime,
        child.toleranceMinutes,
        overtimeRate
      );
      return { date: a.date, minutesLate, amount };
    })
    .filter((e) => e.minutesLate > 0);

  const total = Math.round(entries.reduce((sum, e) => sum + e.amount, 0) * 100) / 100;
  return { entries, total };
}

const IMMUTABLE_INVOICE_STATUSES = new Set(["PAID", "PARTIALLY_PAID", "CANCELLED"]);

export async function closeMonth(
  childId: string,
  month: number,
  year: number,
  discounts = 0,
  otherCharges = 0
) {
  const existing = await prisma.monthlyInvoice.findUnique({
    where: { childId_referenceMonth_referenceYear: { childId, referenceMonth: month, referenceYear: year } },
  });
  if (existing && IMMUTABLE_INVOICE_STATUSES.has(existing.status)) {
    throw new Error("Esta cobrança já foi paga ou cancelada e não pode ser recalculada.");
  }

  const child = await prisma.child.findUniqueOrThrow({ where: { id: childId } });
  const { total: overtimeTotal } = await getMonthlyOvertimeBreakdown(childId, month, year);
  const monthlyFee = Number(child.monthlyFee);
  const totalAmount = Math.round((monthlyFee + overtimeTotal + otherCharges - discounts) * 100) / 100;
  const dueDate = new Date(year, month, child.dueDay);

  return prisma.monthlyInvoice.upsert({
    where: { childId_referenceMonth_referenceYear: { childId, referenceMonth: month, referenceYear: year } },
    create: {
      childId,
      referenceMonth: month,
      referenceYear: year,
      monthlyFee,
      overtimeTotal,
      discounts,
      otherCharges,
      totalAmount,
      dueDate,
    },
    update: {
      monthlyFee,
      overtimeTotal,
      discounts,
      otherCharges,
      totalAmount,
      dueDate,
    },
  });
}

export function effectiveStatus(invoice: Pick<MonthlyInvoice, "status" | "dueDate">): InvoiceStatus {
  if (
    (invoice.status === "PENDING" || invoice.status === "PARTIALLY_PAID") &&
    invoice.dueDate.getTime() < Date.now()
  ) {
    return "OVERDUE";
  }
  return invoice.status;
}
