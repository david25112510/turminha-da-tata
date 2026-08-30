import { describe, expect, it } from "vitest";
import { digits, isValidCpf } from "./cpf";

describe("CPF", () => {
  it("aceita CPF válido com máscara", () => expect(isValidCpf("529.982.247-25")).toBe(true));
  it("recusa valores inválidos", () => {
    expect(isValidCpf("111.111.111-11")).toBe(false);
    expect(isValidCpf("529.982.247-24")).toBe(false);
  });
  it("normaliza somente dígitos", () => expect(digits("529.982.247-25")).toBe("52998224725"));
});
