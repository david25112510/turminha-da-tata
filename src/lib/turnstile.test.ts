import { afterEach, describe, expect, it, vi } from "vitest";
import { verifyTurnstileToken } from "./turnstile";

afterEach(() => { vi.unstubAllGlobals(); delete process.env.TURNSTILE_SECRET_KEY; });

describe("verifyTurnstileToken", () => {
  it("recusa token ausente sem chamar a rede", async () => {
    const fetchSpy = vi.fn(); vi.stubGlobal("fetch", fetchSpy);
    expect(await verifyTurnstileToken(null)).toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
  it("aceita somente success=true do Siteverify", async () => {
    process.env.TURNSTILE_SECRET_KEY = "secret";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true }))));
    expect(await verifyTurnstileToken("valid-token")).toBe(true);
  });
  it("falha fechado em erro de rede", async () => {
    process.env.TURNSTILE_SECRET_KEY = "secret";
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    expect(await verifyTurnstileToken("token")).toBe(false);
  });
});
