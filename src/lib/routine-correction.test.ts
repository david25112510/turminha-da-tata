import { beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.fn();
const findMeal = vi.fn();
const findChild = vi.fn();
const updateMeal = vi.fn();
const createAudit = vi.fn();

beforeEach(() => {
  vi.resetModules();
  auth.mockReset().mockResolvedValue({ user: { id: "caregiver-1", role: "CAREGIVER" } });
  findMeal.mockReset().mockResolvedValue({ id: "meal-1", childId: "child-1", time: new Date("2026-08-29T11:45:00Z") });
  findChild.mockReset().mockResolvedValue({ status: "ACTIVE" });
  updateMeal.mockReset().mockResolvedValue({}); createAudit.mockReset().mockResolvedValue({});
  const tx = { mealRecord: { update: (...args: unknown[]) => updateMeal(...args) }, auditLog: { create: (...args: unknown[]) => createAudit(...args) } };
  vi.doMock("@/auth", () => ({ auth: (...args: unknown[]) => auth(...args) }));
  vi.doMock("next/headers", () => ({ headers: async () => new Headers({ "user-agent": "test" }) }));
  vi.doMock("next/cache", () => ({ revalidatePath: vi.fn() }));
  vi.doMock("@/lib/prisma", () => ({ prisma: { child: { findUnique: (...args: unknown[]) => findChild(...args) }, mealRecord: { findUnique: (...args: unknown[]) => findMeal(...args) }, $transaction: (fn: (value: typeof tx) => unknown) => fn(tx) } }));
  vi.setSystemTime(new Date("2026-08-29T12:00:00Z"));
});

function data(overrides: Record<string, string> = {}) { const fd = new FormData(); for (const [k, v] of Object.entries({ id: "meal-1", childId: "child-1", entity: "MealRecord", newTime: "2026-08-29T08:15", reason: "Horário lançado incorretamente", ...overrides })) fd.set(k, v); return fd; }

describe("correção auditada da rotina", () => {
  it("atualiza e audita oldData, newData, motivo e role atomicamente", async () => {
    const { correctRoutineRecordAction } = await import("./routine-correction");
    await correctRoutineRecordAction(data());
    expect(updateMeal).toHaveBeenCalledWith({ where: { id: "meal-1" }, data: { time: new Date("2026-08-29T11:15:00.000Z") } });
    expect(createAudit).toHaveBeenCalledWith({ data: expect.objectContaining({ actorUserId: "caregiver-1", action: "CORRECTION", entity: "MealRecord", oldData: { childId: "child-1", time: "2026-08-29T11:45:00.000Z" }, newData: expect.objectContaining({ reason: "Horário lançado incorretamente", performedByRole: "CAREGIVER" }) }) });
  });
  it("não confia no childId do formulário", async () => {
    const { correctRoutineRecordAction } = await import("./routine-correction");
    await expect(correctRoutineRecordAction(data({ childId: "child-2" }))).rejects.toThrow("Registro não encontrado");
    expect(updateMeal).not.toHaveBeenCalled();
  });
});
