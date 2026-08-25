import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isRateLimited, recordFailedAttempt, resetAttempts } from "./rate-limit";

/**
 * Sem UPSTASH_REDIS_REST_URL/TOKEN no ambiente de teste, isRateLimited/recordFailedAttempt/
 * resetAttempts caem no fallback em memória (ver src/lib/rate-limit.ts) — mesmo comportamento de
 * sempre, só que agora as três funções são assíncronas (backend compartilhado de verdade não tem
 * como ser síncrono), então todo `await` abaixo é a mudança real desta rodada.
 */
describe("rate-limit", () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  it("is not rate limited before any failed attempt", async () => {
    expect(await isRateLimited("nobody@example.com")).toBe(false);
  });

  it("locks out after 5 failed attempts within the window", async () => {
    const email = "brute-force@example.com";
    for (let i = 0; i < 4; i++) {
      await recordFailedAttempt(email);
      expect(await isRateLimited(email)).toBe(false);
    }
    await recordFailedAttempt(email);
    expect(await isRateLimited(email)).toBe(true);
  });

  it("resetAttempts clears the lockout", async () => {
    const email = "recovers@example.com";
    for (let i = 0; i < 5; i++) await recordFailedAttempt(email);
    expect(await isRateLimited(email)).toBe(true);

    await resetAttempts(email);
    expect(await isRateLimited(email)).toBe(false);
  });

  it("is case-insensitive on the email key", async () => {
    const email = "Mixed.Case@Example.com";
    for (let i = 0; i < 5; i++) await recordFailedAttempt(email);
    expect(await isRateLimited(email.toLowerCase())).toBe(true);
    expect(await isRateLimited(email.toUpperCase())).toBe(true);
  });

  it("clears the lockout once the time window has elapsed", async () => {
    vi.useFakeTimers();
    const email = "expires@example.com";
    const start = new Date(2026, 0, 1, 12, 0, 0);
    vi.setSystemTime(start);

    for (let i = 0; i < 5; i++) await recordFailedAttempt(email);
    expect(await isRateLimited(email)).toBe(true);

    vi.setSystemTime(new Date(start.getTime() + 16 * 60 * 1000));
    expect(await isRateLimited(email)).toBe(false);

    vi.useRealTimers();
  });
});

describe("rate-limit — backend Upstash Redis (UPSTASH_REDIS_REST_URL/TOKEN configurados)", () => {
  const originalUrl = process.env.UPSTASH_REDIS_REST_URL;
  const originalToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  const fetchMock = vi.fn();

  beforeEach(() => {
    process.env.UPSTASH_REDIS_REST_URL = "https://example.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "test-token";
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    process.env.UPSTASH_REDIS_REST_URL = originalUrl;
    process.env.UPSTASH_REDIS_REST_TOKEN = originalToken;
    vi.unstubAllGlobals();
  });

  function jsonResponse(result: unknown) {
    return { ok: true, json: async () => ({ result }) } as Response;
  }

  it("CASO 1: isRateLimited faz GET e considera limitado a partir de 5 tentativas", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(5));
    expect(await isRateLimited("upstash@example.com")).toBe(true);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://example.upstash.io/GET/ratelimit%3Aupstash%40example.com");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer test-token");
  });

  it("CASO 2: isRateLimited com contador ausente (null) não considera limitado", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(null));
    expect(await isRateLimited("primeira-vez@example.com")).toBe(false);
  });

  it("CASO 3: recordFailedAttempt faz INCR e, só na primeira tentativa (resultado 1), também EXPIRE", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(1));
    fetchMock.mockResolvedValueOnce(jsonResponse(undefined));
    await recordFailedAttempt("nova-tentativa@example.com");

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect((fetchMock.mock.calls[0][0] as string)).toContain("/INCR/");
    expect((fetchMock.mock.calls[1][0] as string)).toContain("/EXPIRE/");
  });

  it("CASO 4: recordFailedAttempt na segunda tentativa (resultado 2) não chama EXPIRE de novo", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(2));
    await recordFailedAttempt("segunda-tentativa@example.com");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect((fetchMock.mock.calls[0][0] as string)).toContain("/INCR/");
  });

  it("CASO 5: resetAttempts faz DEL", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(1));
    await resetAttempts("limpar@example.com");

    expect((fetchMock.mock.calls[0][0] as string)).toContain("/DEL/");
  });

  it("CASO 6: resposta não-ok do Upstash rejeita a promise, sem mascarar como 'não limitado'", async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 500 } as Response);
    await expect(isRateLimited("erro@example.com")).rejects.toThrow(/Upstash Redis respondeu 500/);
  });
});
