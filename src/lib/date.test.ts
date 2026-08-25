import { describe, expect, it } from "vitest";
import { formatDuration } from "./date";

/**
 * formatDuration é a formatação usada tanto no fim da soneca (endSleepAction) quanto no timer ao
 * vivo de SleepButton (ChildActionsGrid.tsx) — nunca tinha teste dedicado.
 */
describe("formatDuration", () => {
  it("CASO 1: menos de uma hora mostra só minutos (ex.: 5min)", () => {
    const start = new Date(2026, 7, 21, 14, 0, 0).getTime();
    const end = new Date(2026, 7, 21, 14, 5, 0).getTime();
    expect(formatDuration(start, end)).toBe("5min");
  });

  it("CASO 2: exatamente uma hora mostra horas com minutos zerados (1h00min)", () => {
    const start = new Date(2026, 7, 21, 14, 0, 0).getTime();
    const end = new Date(2026, 7, 21, 15, 0, 0).getTime();
    expect(formatDuration(start, end)).toBe("1h00min");
  });

  it("CASO 3: horas e minutos combinados, com zero à esquerda (1h05min)", () => {
    const start = new Date(2026, 7, 21, 14, 0, 0).getTime();
    const end = new Date(2026, 7, 21, 15, 5, 0).getTime();
    expect(formatDuration(start, end)).toBe("1h05min");
  });

  it("CASO 4: mais de uma hora sem minuto quebrado (2h30min)", () => {
    const start = new Date(2026, 7, 21, 12, 0, 0).getTime();
    const end = new Date(2026, 7, 21, 14, 30, 0).getTime();
    expect(formatDuration(start, end)).toBe("2h30min");
  });

  it("CASO 5: zero minutos decorridos (0min)", () => {
    const start = new Date(2026, 7, 21, 14, 0, 0).getTime();
    expect(formatDuration(start, start)).toBe("0min");
  });

  it("CASO 6: arredonda para o minuto mais próximo em vez de truncar", () => {
    const start = new Date(2026, 7, 21, 14, 0, 0).getTime();
    const end = start + 90_000; // 1min30s → arredonda para 2min, não trunca para 1min
    expect(formatDuration(start, end)).toBe("2min");
  });
});
