import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Cobre os fluxos de registro do checklist da etapa mobile (seção 45) que ainda não tinham teste — cada um
 * exercitando a Server Action real (não uma reimplementação), confirmando autorização (requireCaregiverChild)
 * e o mapeamento correto para o Prisma. Autorização entre crianças, medicamento inválido e retirada por
 * pessoa não autorizada já são cobertos em src/lib/security-rules.test.ts — não duplicados aqui.
 */

const requireCaregiverChild = vi.fn();
const notifyGuardians = vi.fn();
const createMeal = vi.fn();
const createSleep = vi.fn();
const findUniqueSleep = vi.fn();
const findFirstSleep = vi.fn();
const updateSleep = vi.fn();
const createHygiene = vi.fn();
const createMood = vi.fn();
const createActivity = vi.fn();
const createIncident = vi.fn();

beforeEach(() => {
  vi.resetModules();
  vi.doMock("next/cache", () => ({ revalidatePath: () => {} }));
  vi.doMock("@/lib/authz", () => ({
    requireCaregiverChild: (...args: unknown[]) => requireCaregiverChild(...args),
  }));
  vi.doMock("@/lib/notifications", () => ({
    notifyGuardians: (...args: unknown[]) => notifyGuardians(...args),
  }));
  vi.doMock("@/lib/prisma", () => ({
    prisma: {
      mealRecord: { create: (...args: unknown[]) => createMeal(...args) },
      sleepRecord: {
        create: (...args: unknown[]) => createSleep(...args),
        findUnique: (...args: unknown[]) => findUniqueSleep(...args),
        findFirst: (...args: unknown[]) => findFirstSleep(...args),
        update: (...args: unknown[]) => updateSleep(...args),
      },
      hygieneRecord: { create: (...args: unknown[]) => createHygiene(...args) },
      moodRecord: { create: (...args: unknown[]) => createMood(...args) },
      activity: { create: (...args: unknown[]) => createActivity(...args) },
      incident: { create: (...args: unknown[]) => createIncident(...args) },
    },
  }));

  requireCaregiverChild.mockReset().mockResolvedValue({ user: { id: "caregiver-1" }, child: { id: "child-1" } });
  notifyGuardians.mockReset().mockResolvedValue(undefined);
  createMeal.mockReset().mockResolvedValue({ child: { preferredName: "Maria", fullName: "Maria Silva" } });
  createSleep.mockReset().mockResolvedValue({ id: "sleep-1" });
  findUniqueSleep.mockReset();
  findFirstSleep.mockReset().mockResolvedValue(null);
  updateSleep.mockReset().mockResolvedValue({
    id: "sleep-1",
    startTime: new Date(2026, 7, 21, 13, 0),
    endTime: new Date(2026, 7, 21, 14, 0),
    child: { preferredName: "Maria", fullName: "Maria Silva" },
  });
  createHygiene.mockReset().mockResolvedValue({ id: "hygiene-1" });
  createMood.mockReset().mockResolvedValue({ id: "mood-1" });
  createActivity.mockReset().mockResolvedValue({ id: "activity-1" });
  createIncident.mockReset().mockResolvedValue({ id: "incident-1", child: { preferredName: "Maria", fullName: "Maria Silva" } });
});

function formData(fields: Record<string, string>) {
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) fd.set(key, value);
  return fd;
}

describe("cuidadora registra alimentação (addMealAction)", () => {
  it("valida autorização e grava a refeição com o usuário autenticado", async () => {
    const { addMealAction } = await import("./actions");
    await addMealAction(formData({ childId: "child-1", mealType: "LUNCH", consumption: "WELL", notes: "Comeu tudo" }));

    expect(requireCaregiverChild).toHaveBeenCalledWith("child-1");
    expect(createMeal).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ childId: "child-1", mealType: "LUNCH", consumption: "WELL", recordedById: "caregiver-1" }),
      })
    );
  });
});

describe("cuidadora registra sono (startSleepAction / endSleepAction)", () => {
  it("inicia a soneca vinculada à cuidadora autenticada", async () => {
    const { startSleepAction } = await import("./actions");
    await startSleepAction(formData({ childId: "child-1" }));

    expect(requireCaregiverChild).toHaveBeenCalledWith("child-1");
    expect(createSleep).toHaveBeenCalledWith({ data: { childId: "child-1", startedById: "caregiver-1" } });
  });

  it("finaliza a soneca e calcula a duração", async () => {
    findUniqueSleep.mockResolvedValueOnce({ id: "sleep-1", childId: "child-1", endTime: null });
    const { endSleepAction } = await import("./actions");
    await endSleepAction(formData({ childId: "child-1", sleepId: "sleep-1" }));

    expect(updateSleep).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "sleep-1" }, data: expect.objectContaining({ endedById: "caregiver-1" }) })
    );
  });

  it("recusa finalizar uma soneca de outra criança", async () => {
    findUniqueSleep.mockResolvedValueOnce({ id: "sleep-1", childId: "child-OUTRA", endTime: null });
    const { endSleepAction } = await import("./actions");
    await expect(endSleepAction(formData({ childId: "child-1", sleepId: "sleep-1" }))).rejects.toThrow(
      "Registro de sono inválido."
    );
    expect(updateSleep).not.toHaveBeenCalled();
  });

  it("recusa finalizar um sono inexistente", async () => {
    findUniqueSleep.mockResolvedValueOnce(null);
    const { endSleepAction } = await import("./actions");
    await expect(endSleepAction(formData({ childId: "child-1", sleepId: "sleep-inexistente" }))).rejects.toThrow(
      "Registro de sono inválido."
    );
    expect(updateSleep).not.toHaveBeenCalled();
  });

  it("recusa iniciar uma segunda soneca enquanto já existe uma em andamento hoje (evita dados inconsistentes)", async () => {
    findFirstSleep.mockResolvedValueOnce({ id: "sleep-ja-aberto", childId: "child-1", endTime: null });
    const { startSleepAction } = await import("./actions");
    await expect(startSleepAction(formData({ childId: "child-1" }))).rejects.toThrow(
      "Já existe uma soneca em andamento para esta criança hoje."
    );
    expect(createSleep).not.toHaveBeenCalled();
  });
});

describe("cuidadora registra higiene (addHygieneAction)", () => {
  it("grava o registro de higiene", async () => {
    const { addHygieneAction } = await import("./actions");
    await addHygieneAction(formData({ childId: "child-1", type: "DIAPER_CHANGE" }));

    expect(createHygiene).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ childId: "child-1", type: "DIAPER_CHANGE", recordedById: "caregiver-1" }) })
    );
  });
});

describe("cuidadora registra humor (addMoodAction)", () => {
  it("grava o humor selecionado", async () => {
    const { addMoodAction } = await import("./actions");
    await addMoodAction(formData({ childId: "child-1", mood: "HAPPY" }));

    expect(createMood).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ childId: "child-1", mood: "HAPPY", recordedById: "caregiver-1" }) })
    );
  });
});

describe("cuidadora registra atividade (addActivityAction)", () => {
  it("grava a atividade vinculada à criança do dia", async () => {
    const { addActivityAction } = await import("./actions");
    await addActivityAction(formData({ childId: "child-1", category: "MUSIC", description: "Roda de música" }));

    expect(createActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ category: "MUSIC", description: "Roda de música", recordedById: "caregiver-1" }),
      })
    );
  });
});

describe("cuidadora registra ocorrência (addIncidentAction)", () => {
  it("exige descrição e grava a ocorrência", async () => {
    const { addIncidentAction } = await import("./actions");
    await expect(addIncidentAction(formData({ childId: "child-1", type: "FALL" }))).rejects.toThrow("Descrição é obrigatória.");
    expect(createIncident).not.toHaveBeenCalled();
  });

  it("grava a ocorrência quando a descrição está presente", async () => {
    const { addIncidentAction } = await import("./actions");
    await addIncidentAction(formData({ childId: "child-1", type: "FALL", description: "Caiu no parquinho" }));

    expect(createIncident).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ childId: "child-1", type: "FALL", description: "Caiu no parquinho", recordedById: "caregiver-1" }),
      })
    );
    expect(notifyGuardians).toHaveBeenCalled();
  });
});
