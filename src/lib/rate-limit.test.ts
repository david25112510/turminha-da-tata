import { beforeEach, describe, expect, it, vi } from "vitest";
import { isRateLimited, recordFailedAttempt, resetAttempts } from "./rate-limit";

describe("rate-limit", () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  it("is not rate limited before any failed attempt", () => {
    expect(isRateLimited("nobody@example.com")).toBe(false);
  });

  it("locks out after 5 failed attempts within the window", () => {
    const email = "brute-force@example.com";
    for (let i = 0; i < 4; i++) {
      recordFailedAttempt(email);
      expect(isRateLimited(email)).toBe(false);
    }
    recordFailedAttempt(email);
    expect(isRateLimited(email)).toBe(true);
  });

  it("resetAttempts clears the lockout", () => {
    const email = "recovers@example.com";
    for (let i = 0; i < 5; i++) recordFailedAttempt(email);
    expect(isRateLimited(email)).toBe(true);

    resetAttempts(email);
    expect(isRateLimited(email)).toBe(false);
  });

  it("is case-insensitive on the email key", () => {
    const email = "Mixed.Case@Example.com";
    for (let i = 0; i < 5; i++) recordFailedAttempt(email);
    expect(isRateLimited(email.toLowerCase())).toBe(true);
    expect(isRateLimited(email.toUpperCase())).toBe(true);
  });

  it("clears the lockout once the time window has elapsed", () => {
    vi.useFakeTimers();
    const email = "expires@example.com";
    const start = new Date(2026, 0, 1, 12, 0, 0);
    vi.setSystemTime(start);

    for (let i = 0; i < 5; i++) recordFailedAttempt(email);
    expect(isRateLimited(email)).toBe(true);

    vi.setSystemTime(new Date(start.getTime() + 16 * 60 * 1000));
    expect(isRateLimited(email)).toBe(false);

    vi.useRealTimers();
  });
});
