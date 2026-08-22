import { describe, expect, it, vi } from "vitest";
import { calculateOvertimeForAttendance } from "./financial";

function at(hour: number, minute: number) {
  const d = new Date(2026, 7, 21, hour, minute, 0, 0);
  return d;
}

describe("calculateOvertimeForAttendance", () => {
  it("matches the exact example from the spec: 42min late at R$15/h tolerance-exceeded → R$10.50", () => {
    const result = calculateOvertimeForAttendance(at(18, 12), "17:30", 15, 15);
    expect(result.minutesLate).toBe(42);
    expect(result.amount).toBeCloseTo(10.5, 2);
  });

  it("does not charge when leaving within the tolerance window", () => {
    const result = calculateOvertimeForAttendance(at(17, 42), "17:30", 15, 15);
    expect(result.minutesLate).toBe(0);
    expect(result.amount).toBe(0);
  });

  it("charges the full elapsed minutes (not just the excess over tolerance) once tolerance is breached", () => {
    // contracted 17:30, tolerance 15min, left at 17:50 → 20 minutes late, spec says all 20 are billable
    const result = calculateOvertimeForAttendance(at(17, 50), "17:30", 15, 15);
    expect(result.minutesLate).toBe(20);
  });

  it("treats leaving exactly at the tolerance boundary as not billable", () => {
    const result = calculateOvertimeForAttendance(at(17, 45), "17:30", 15, 15);
    expect(result.minutesLate).toBe(0);
  });

  it("treats leaving one minute past the tolerance boundary as fully billable", () => {
    const result = calculateOvertimeForAttendance(at(17, 46), "17:30", 15, 15);
    expect(result.minutesLate).toBe(16);
  });

  it("never charges for leaving earlier than the contracted time", () => {
    const result = calculateOvertimeForAttendance(at(17, 0), "17:30", 15, 15);
    expect(result.minutesLate).toBe(0);
    expect(result.amount).toBe(0);
  });

  it("computes the per-minute rate as hourRate / 60", () => {
    const result = calculateOvertimeForAttendance(at(18, 0), "17:30", 0, 60);
    expect(result.minutesLate).toBe(30);
    expect(result.amount).toBeCloseTo(30, 2);
  });
});

describe("closeMonth", () => {
  const findUniqueInvoice = vi.fn();
  const findUniqueOrThrowChild = vi.fn();
  const findManyAttendance = vi.fn();
  const upsertInvoice = vi.fn();

  vi.doMock("@/lib/prisma", () => ({
    prisma: {
      monthlyInvoice: {
        findUnique: (...args: unknown[]) => findUniqueInvoice(...args),
        upsert: (...args: unknown[]) => upsertInvoice(...args),
      },
      child: { findUniqueOrThrow: (...args: unknown[]) => findUniqueOrThrowChild(...args) },
      attendance: { findMany: (...args: unknown[]) => findManyAttendance(...args) },
    },
  }));

  const baseChild = {
    id: "child-1",
    monthlyFee: 900,
    overtimeHourRate: 15,
    contractedExitTime: "17:30",
    toleranceMinutes: 15,
    dueDay: 5,
  };

  it.each(["PAID", "PARTIALLY_PAID", "CANCELLED"])(
    "refuses to recalculate a %s invoice",
    async (status) => {
      vi.resetModules();
      findUniqueInvoice.mockReset().mockResolvedValueOnce({ status });
      findUniqueOrThrowChild.mockReset();
      findManyAttendance.mockReset();
      upsertInvoice.mockReset();

      const { closeMonth } = await import("./financial");
      await expect(closeMonth("child-1", 9, 2026)).rejects.toThrow(
        "Esta cobrança já foi paga ou cancelada e não pode ser recalculada."
      );
      expect(upsertInvoice).not.toHaveBeenCalled();
    }
  );

  it.each(["PENDING", "OVERDUE"])("recalculates a %s invoice normally", async (status) => {
    vi.resetModules();
    findUniqueInvoice.mockReset().mockResolvedValueOnce({ status });
    findUniqueOrThrowChild.mockReset().mockResolvedValue(baseChild);
    findManyAttendance.mockReset().mockResolvedValueOnce([]);
    upsertInvoice.mockReset().mockResolvedValueOnce({ id: "invoice-1" });

    const { closeMonth } = await import("./financial");
    await closeMonth("child-1", 9, 2026);
    expect(upsertInvoice).toHaveBeenCalledOnce();
  });

  it("creates a fresh invoice when none exists yet for the period", async () => {
    vi.resetModules();
    findUniqueInvoice.mockReset().mockResolvedValueOnce(null);
    findUniqueOrThrowChild.mockReset().mockResolvedValue(baseChild);
    findManyAttendance.mockReset().mockResolvedValueOnce([]);
    upsertInvoice.mockReset().mockResolvedValueOnce({ id: "invoice-1" });

    const { closeMonth } = await import("./financial");
    await closeMonth("child-1", 9, 2026);
    expect(upsertInvoice).toHaveBeenCalledOnce();
  });
});
