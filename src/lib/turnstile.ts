const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
export const TURNSTILE_FIELD = "cf-turnstile-response";

type SiteverifyResponse = { success?: boolean; "error-codes"?: string[] };

export async function verifyTurnstileToken(token: FormDataEntryValue | null): Promise<boolean> {
  const value = typeof token === "string" ? token.trim() : "";
  if (!value || value.length > 2048) return false;
  const secret = process.env.TURNSTILE_SECRET_KEY ?? (process.env.NODE_ENV !== "production" ? "1x0000000000000000000000000000000AA" : undefined);
  if (!secret) return false;
  try {
    const response = await fetch(SITEVERIFY_URL, {
      method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret, response: value }), cache: "no-store", signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return false;
    return ((await response.json()) as SiteverifyResponse).success === true;
  } catch { return false; }
}

export function turnstileError() {
  return { error: "Não foi possível confirmar que você é uma pessoa. Atualize a verificação e tente novamente." };
}
