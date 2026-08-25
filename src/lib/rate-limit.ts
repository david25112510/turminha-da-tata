const WINDOW_MS = 15 * 60 * 1000;
const WINDOW_SECONDS = WINDOW_MS / 1000;
const MAX_ATTEMPTS = 5;

function normalize(key: string) {
  return key.trim().toLowerCase();
}

function isUpstashConfigured() {
  return Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

/** Uma chamada de comando via REST do Upstash Redis — https://<url>/<CMD>/<arg1>/<arg2>, Bearer token. */
async function upstash(...args: (string | number)[]): Promise<unknown> {
  const url = process.env.UPSTASH_REDIS_REST_URL!;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN!;
  const path = args.map((a) => encodeURIComponent(String(a))).join("/");

  const response = await fetch(`${url}/${path}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) throw new Error(`Upstash Redis respondeu ${response.status} para ${args[0]}`);
  const body = (await response.json()) as { result: unknown };
  return body.result;
}

// Fallback em memória — usado quando UPSTASH_REDIS_REST_URL/UPSTASH_REDIS_REST_TOKEN não estão
// configurados (dev local, ou uma única instância sem necessidade de estado compartilhado). Mesma
// limitação de sempre: não sobrevive a restart nem é compartilhado entre múltiplas instâncias — ver
// docs/deploy.md.
type MemoryEntry = { count: number; windowStart: number };
const memoryAttempts = new Map<string, MemoryEntry>();

function memoryIsRateLimited(key: string): boolean {
  const entry = memoryAttempts.get(key);
  if (!entry) return false;
  if (Date.now() - entry.windowStart > WINDOW_MS) {
    memoryAttempts.delete(key);
    return false;
  }
  return entry.count >= MAX_ATTEMPTS;
}

function memoryRecordFailedAttempt(key: string) {
  const now = Date.now();
  const entry = memoryAttempts.get(key);
  if (!entry || now - entry.windowStart > WINDOW_MS) {
    memoryAttempts.set(key, { count: 1, windowStart: now });
    return;
  }
  entry.count += 1;
}

/**
 * Rate limiting de tentativas de login (e de pedidos de recuperação de senha, com chave separada —
 * ver src/app/esqueci-senha/actions.ts): 5 tentativas falhas por chave a cada 15 minutos. Usa
 * Upstash Redis (REST, sem SDK — mesmo padrão de src/lib/email.ts) quando configurado, para
 * funcionar corretamente com múltiplas instâncias; cai para um Map em memória do processo quando
 * não está. Interface pública (nomes e formato dos parâmetros) preservada — só passou a ser
 * assíncrona, porque um backend compartilhado de verdade não tem como ser síncrono.
 */
export async function isRateLimited(key: string): Promise<boolean> {
  const normalized = normalize(key);
  if (isUpstashConfigured()) {
    const count = await upstash("GET", `ratelimit:${normalized}`);
    return Number(count ?? 0) >= MAX_ATTEMPTS;
  }
  return memoryIsRateLimited(normalized);
}

export async function recordFailedAttempt(key: string): Promise<void> {
  const normalized = normalize(key);
  if (isUpstashConfigured()) {
    const redisKey = `ratelimit:${normalized}`;
    const count = await upstash("INCR", redisKey);
    if (Number(count) === 1) {
      // Só define o TTL na primeira tentativa da janela — chamadas seguintes só incrementam.
      await upstash("EXPIRE", redisKey, WINDOW_SECONDS);
    }
    return;
  }
  memoryRecordFailedAttempt(normalized);
}

export async function resetAttempts(key: string): Promise<void> {
  const normalized = normalize(key);
  if (isUpstashConfigured()) {
    await upstash("DEL", `ratelimit:${normalized}`);
    return;
  }
  memoryAttempts.delete(normalized);
}
