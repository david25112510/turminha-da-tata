import { describe, expect, it } from "vitest";
import { base32Decode, base32Encode, generateTotpSecret, hotp, totpUri, verifyTotpCode } from "./totp";

// Segredo oficial dos vetores de teste da RFC 4226 Apêndice D: a string ASCII "12345678901234567890".
const RFC4226_KEY = Buffer.from("12345678901234567890", "ascii");

describe("hotp — vetores oficiais da RFC 4226 Apêndice D", () => {
  const expected = [
    "755224", "287082", "359152", "969429", "338314",
    "254676", "287922", "162583", "399871", "520489",
  ];

  it.each(expected.map((code, counter) => [counter, code] as const))(
    "CASO contador %i → %s",
    (counter, code) => {
      expect(hotp(RFC4226_KEY, counter)).toBe(code);
    }
  );
});

describe("base32Encode/base32Decode", () => {
  it("CASO 1: round-trip preserva os bytes originais para um segredo aleatório", () => {
    const original = Buffer.from([0, 1, 2, 3, 255, 254, 128, 64, 32, 16]);
    expect(base32Decode(base32Encode(original))).toEqual(original);
  });

  it("CASO 2: valores conhecidos da RFC 4648 (sem padding)", () => {
    expect(base32Encode(Buffer.from("f", "ascii"))).toBe("MY");
    expect(base32Encode(Buffer.from("foo", "ascii"))).toBe("MZXW6");
    expect(base32Encode(Buffer.from("foobar", "ascii"))).toBe("MZXW6YTBOI");
  });

  it("CASO 3: decode aceita minúsculas e ignora caracteres fora do alfabeto (ex.: espaços de formatação)", () => {
    expect(base32Decode("mzxw6ytboi")).toEqual(Buffer.from("foobar", "ascii"));
    expect(base32Decode("MZXW 6YTB OI")).toEqual(Buffer.from("foobar", "ascii"));
  });
});

describe("generateTotpSecret / totpUri", () => {
  it("CASO 4: gera segredos diferentes a cada chamada, sempre base32 válido", () => {
    const a = generateTotpSecret();
    const b = generateTotpSecret();
    expect(a).not.toBe(b);
    expect(a).toMatch(/^[A-Z2-7]+$/);
    expect(base32Decode(a)).toHaveLength(20);
  });

  it("CASO 5: a URI otpauth:// inclui emissor, conta e o segredo, corretamente escapada", () => {
    const uri = totpUri("JBSWY3DPEHPK3PXP", "admin@turminhadatata.com.br");
    expect(uri).toMatch(/^otpauth:\/\/totp\//);
    expect(uri).toContain("secret=JBSWY3DPEHPK3PXP");
    expect(uri).toContain("issuer=Turminha");
    expect(decodeURIComponent(uri)).toContain("admin@turminhadatata.com.br");
  });
});

describe("verifyTotpCode", () => {
  // Mesmo segredo da RFC, agora em base32, para gerar códigos "reais" e conferir a validação ponta a ponta.
  const secret = base32Encode(RFC4226_KEY);
  const STEP_MS = 30_000;

  it("CASO 6: aceita o código correto do passo de tempo atual", () => {
    const now = 59 * 1000; // igual ao primeiro vetor de tempo da RFC 6238 (T=59s → contador 1)
    const code = hotp(RFC4226_KEY, Math.floor(now / STEP_MS));
    expect(verifyTotpCode(secret, code, now)).toBe(true);
  });

  it("CASO 7: recusa um código de 6 dígitos incorreto", () => {
    const now = 59 * 1000;
    const correct = hotp(RFC4226_KEY, Math.floor(now / STEP_MS));
    const wrong = correct === "000000" ? "111111" : "000000";
    expect(verifyTotpCode(secret, wrong, now)).toBe(false);
  });

  it("CASO 8: aceita o código do passo anterior (tolerância de relógio) mas não dois passos atrás", () => {
    const now = 90 * 1000; // contador 3
    const oneStepAgo = hotp(RFC4226_KEY, Math.floor(now / STEP_MS) - 1);
    const twoStepsAgo = hotp(RFC4226_KEY, Math.floor(now / STEP_MS) - 2);
    expect(verifyTotpCode(secret, oneStepAgo, now)).toBe(true);
    expect(verifyTotpCode(secret, twoStepsAgo, now)).toBe(false);
  });

  it("CASO 9: recusa formato inválido sem lançar erro (letras, tamanho errado, vazio)", () => {
    expect(verifyTotpCode(secret, "abcdef")).toBe(false);
    expect(verifyTotpCode(secret, "12345")).toBe(false);
    expect(verifyTotpCode(secret, "")).toBe(false);
  });
});
