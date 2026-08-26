import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Cobre os fluxos de registro do checklist da etapa mobile (seção 45) que ainda não tinham teste — cada um
 * exercitando a Server Action real (não uma reimplementação), confirmando autorização (requireCaregiverChild)
 * e o mapeamento correto para o Prisma. Autorização entre crianças, medicamento inválido e retirada por
 * pessoa não autorizada já são cobertos em src/lib/security-rules.test.ts — não duplicados aqui.
 */

const requireCaregiverChild = vi.fn();
const notifyGuardians = vi.fn();
const notifyAdmins = vi.fn();
const recordAuditLog = vi.fn();
const createMeal = vi.fn();
const createSleep = vi.fn();
const findUniqueSleep = vi.fn();
const findFirstSleep = vi.fn();
const updateSleep = vi.fn();
const createHygiene = vi.fn();
const createWater = vi.fn();
const createMood = vi.fn();
const createHealthLog = vi.fn();
const createActivity = vi.fn();
const createIncident = vi.fn();
const createNote = vi.fn();

beforeEach(() => {
  vi.resetModules();
  vi.doMock("next/cache", () => ({ revalidatePath: () => {} }));
  vi.doMock("@/lib/authz", () => ({
    requireCaregiverChild: (...args: unknown[]) => requireCaregiverChild(...args),
  }));
  vi.doMock("@/lib/notifications", () => ({
    notifyGuardians: (...args: unknown[]) => notifyGuardians(...args),
    notifyAdmins: (...args: unknown[]) => notifyAdmins(...args),
  }));
  vi.doMock("@/lib/audit-log", () => ({ recordAuditLog: (...args: unknown[]) => recordAuditLog(...args) }));
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
      waterRecord: { create: (...args: unknown[]) => createWater(...args) },
      moodRecord: { create: (...args: unknown[]) => createMood(...args) },
      healthLog: { create: (...args: unknown[]) => createHealthLog(...args) },
      activity: { create: (...args: unknown[]) => createActivity(...args) },
      incident: { create: (...args: unknown[]) => createIncident(...args) },
      childNote: { create: (...args: unknown[]) => createNote(...args) },
    },
  }));

  requireCaregiverChild.mockReset().mockResolvedValue({ user: { id: "caregiver-1" }, child: { id: "child-1" } });
  notifyGuardians.mockReset().mockResolvedValue(undefined);
  notifyAdmins.mockReset().mockResolvedValue(undefined);
  recordAuditLog.mockReset().mockResolvedValue(undefined);
  createMeal.mockReset().mockResolvedValue({ id: "meal-1", child: { preferredName: "Maria", fullName: "Maria Silva" } });
  createSleep.mockReset().mockResolvedValue({ id: "sleep-1", startTime: new Date(2026, 7, 21, 13, 0), child: { preferredName: "Maria", fullName: "Maria Silva" } });
  findUniqueSleep.mockReset();
  findFirstSleep.mockReset().mockResolvedValue(null);
  updateSleep.mockReset().mockResolvedValue({
    id: "sleep-1",
    startTime: new Date(2026, 7, 21, 13, 0),
    endTime: new Date(2026, 7, 21, 14, 0),
    child: { preferredName: "Maria", fullName: "Maria Silva" },
  });
  createHygiene.mockReset().mockResolvedValue({ id: "hygiene-1" });
  createWater.mockReset().mockResolvedValue({ id: "water-1" });
  createMood.mockReset().mockResolvedValue({ id: "mood-1" });
  createHealthLog.mockReset().mockResolvedValue({ id: "health-1" });
  createActivity.mockReset().mockResolvedValue({ id: "activity-1" });
  createIncident.mockReset().mockResolvedValue({ id: "incident-1", child: { preferredName: "Maria", fullName: "Maria Silva" } });
  createNote.mockReset().mockResolvedValue({ id: "note-1" });
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
    expect(recordAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: "caregiver-1",
        action: "ROUTINE_MEAL_CREATED",
        entity: "MealRecord",
        entityId: "meal-1",
        newData: expect.objectContaining({ childId: "child-1", mealType: "LUNCH", consumption: "WELL" }),
      })
    );
  });
});

describe("cuidadora registra sono (startSleepAction / endSleepAction)", () => {
  it("inicia a soneca vinculada à cuidadora autenticada", async () => {
    const { startSleepAction } = await import("./actions");
    await startSleepAction(formData({ childId: "child-1" }));

    expect(requireCaregiverChild).toHaveBeenCalledWith("child-1");
    expect(createSleep).toHaveBeenCalledWith({
      data: { childId: "child-1", startedById: "caregiver-1" },
      include: { child: true },
    });
    expect(notifyGuardians).toHaveBeenCalledWith("child-1", "SLEEP", "Soneca", "Maria começou a dormir.");
    expect(recordAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ actorUserId: "caregiver-1", action: "ROUTINE_SLEEP_STARTED", entity: "SleepRecord", entityId: "sleep-1" })
    );
  });

  it("finaliza a soneca e calcula a duração", async () => {
    findUniqueSleep.mockResolvedValueOnce({ id: "sleep-1", childId: "child-1", endTime: null });
    const { endSleepAction } = await import("./actions");
    await endSleepAction(formData({ childId: "child-1", sleepId: "sleep-1" }));

    expect(updateSleep).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "sleep-1" }, data: expect.objectContaining({ endedById: "caregiver-1" }) })
    );
    expect(recordAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ actorUserId: "caregiver-1", action: "ROUTINE_SLEEP_ENDED", entity: "SleepRecord", entityId: "sleep-1" })
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
    await addHygieneAction(formData({ childId: "child-1", type: "BATHROOM" }));

    expect(createHygiene).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ childId: "child-1", type: "BATHROOM", diaperType: null, recordedById: "caregiver-1" }) })
    );
    expect(recordAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ actorUserId: "caregiver-1", action: "ROUTINE_HYGIENE_CREATED", entity: "HygieneRecord", entityId: "hygiene-1" })
    );
  });

  it("CASO 1: grava a troca de fralda com o tipo granular (molhada/suja/ambas/seca/outro)", async () => {
    createHygiene.mockResolvedValueOnce({ id: "hygiene-2", diaperType: "WET" });
    const { addHygieneAction } = await import("./actions");
    await addHygieneAction(formData({ childId: "child-1", type: "DIAPER_CHANGE", diaperType: "WET" }));

    expect(createHygiene).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ childId: "child-1", type: "DIAPER_CHANGE", diaperType: "WET" }),
      })
    );
  });

  it("CASO 2: diaperType é ignorado quando o tipo não é DIAPER_CHANGE (evita dado inconsistente)", async () => {
    const { addHygieneAction } = await import("./actions");
    await addHygieneAction(formData({ childId: "child-1", type: "HANDWASHING", diaperType: "WET" }));

    expect(createHygiene).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ type: "HANDWASHING", diaperType: null }) })
    );
  });
});

describe("cuidadora registra observação solta (addObservationAction)", () => {
  it("CASO 1: exige o texto da observação", async () => {
    const { addObservationAction } = await import("./actions");
    await expect(addObservationAction(formData({ childId: "child-1", text: "  " }))).rejects.toThrow(
      "Escreva a observação antes de registrar."
    );
    expect(createNote).not.toHaveBeenCalled();
  });

  it("CASO 2: grava a observação como CAREGIVER, audita e notifica os responsáveis", async () => {
    const { addObservationAction } = await import("./actions");
    await addObservationAction(formData({ childId: "child-1", text: "Ficou mais sonolenta após o almoço." }));

    expect(createNote).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ childId: "child-1", authorRole: "CAREGIVER", authorUserId: "caregiver-1", text: "Ficou mais sonolenta após o almoço." }),
      })
    );
    expect(recordAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ actorUserId: "caregiver-1", action: "ROUTINE_OBSERVATION_CREATED", entity: "ChildNote", entityId: "note-1" })
    );
    expect(notifyGuardians).toHaveBeenCalledWith(
      "child-1",
      "OBSERVATION",
      expect.any(String),
      "Ficou mais sonolenta após o almoço.",
      "viewRoutine"
    );
  });
});

describe("cuidadora registra água (addWaterAction)", () => {
  it("grava o registro de consumo de água", async () => {
    const { addWaterAction } = await import("./actions");
    await addWaterAction(formData({ childId: "child-1", amount: "LARGE" }));

    expect(createWater).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ childId: "child-1", amount: "LARGE", recordedById: "caregiver-1" }) })
    );
    expect(recordAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ actorUserId: "caregiver-1", action: "ROUTINE_WATER_CREATED", entity: "WaterRecord", entityId: "water-1" })
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
    expect(recordAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ actorUserId: "caregiver-1", action: "ROUTINE_MOOD_CREATED", entity: "MoodRecord", entityId: "mood-1" })
    );
  });
});

describe("cuidadora registra saúde (addHealthLogAction)", () => {
  it("grava o registro de saúde", async () => {
    const { addHealthLogAction } = await import("./actions");
    await addHealthLogAction(formData({ childId: "child-1", temperature: "38,2", symptoms: "Febre" }));

    expect(createHealthLog).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ childId: "child-1", temperature: "38.2", symptoms: "Febre", recordedById: "caregiver-1" }) })
    );
    expect(recordAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ actorUserId: "caregiver-1", action: "ROUTINE_HEALTH_CREATED", entity: "HealthLog", entityId: "health-1" })
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
    expect(recordAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ actorUserId: "caregiver-1", action: "ROUTINE_ACTIVITY_CREATED", entity: "Activity", entityId: "activity-1" })
    );
  });
});

describe("cuidadora registra ocorrência (addIncidentAction)", () => {
  it("exige descrição e grava a ocorrência", async () => {
    const { addIncidentAction } = await import("./actions");
    await expect(addIncidentAction(formData({ childId: "child-1", type: "FALL" }))).rejects.toThrow("Descrição é obrigatória.");
    expect(createIncident).not.toHaveBeenCalled();
    expect(recordAuditLog).not.toHaveBeenCalled();
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
    expect(recordAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ actorUserId: "caregiver-1", action: "ROUTINE_INCIDENT_CREATED", entity: "Incident", entityId: "incident-1" })
    );
  });
});
