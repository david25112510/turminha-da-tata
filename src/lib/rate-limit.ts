const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

type Entry = { count: number; windowStart: number };

const attempts = new Map<string, Entry>();

function normalize(key: string) {
  return key.trim().toLowerCase();
}

export function isRateLimited(key: string): boolean {
  const entry = attempts.get(normalize(key));
  if (!entry) return false;

  if (Date.now() - entry.windowStart > WINDOW_MS) {
    attempts.delete(normalize(key));
    return false;
  }

  return entry.count >= MAX_ATTEMPTS;
}

export function recordFailedAttempt(key: string) {
  const normalized = normalize(key);
  const entry = attempts.get(normalized);
  const now = Date.now();

  if (!entry || now - entry.windowStart > WINDOW_MS) {
    attempts.set(normalized, { count: 1, windowStart: now });
    return;
  }

  entry.count += 1;
}

export function resetAttempts(key: string) {
  attempts.delete(normalize(key));
}
