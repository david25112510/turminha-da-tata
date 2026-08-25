import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * TOTP (RFC 6238) sobre HOTP (RFC 4226) implementado sem dependência — só node:crypto, mesmo espírito
 * de src/lib/email.ts e src/lib/rate-limit.ts (chamada HTTP/algoritmo direto em vez de SDK). Sem
 * geração de QR code: a tela de configuração mostra o segredo em texto + a URI otpauth:// — todo
 * app autenticador (Google Authenticator, Authy, 1Password...) aceita entrada manual do segredo.
 *
 * hotp() é testado diretamente contra os vetores oficiais da RFC 4226 Apêndice D (segredo ASCII
 * "12345678901234567890", contadores 0-9) — é a peça criptográfica que realmente importa acertar.
 */

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const STEP_SECONDS = 30;
const DIGITS = 6;

export function base32Encode(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = "";
  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }
  return output;
}

export function base32Decode(input: string): Buffer {
  const clean = input.toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const char of clean) {
    const index = BASE32_ALPHABET.indexOf(char);
    if (index === -1) continue;
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

/** HOTP (RFC 4226) — código de `digits` dígitos para um contador dado, a partir da chave em bytes. */
export function hotp(keyBytes: Buffer, counter: number, digits = DIGITS): string {
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(BigInt(counter));

  const hmac = createHmac("sha1", keyBytes).update(counterBuffer).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  const code = (binary % 10 ** digits).toString().padStart(digits, "0");
  return code;
}

/** Novo segredo TOTP — 20 bytes aleatórios (160 bits, o tamanho recomendado pela RFC 4226 §4), base32. */
export function generateTotpSecret(): string {
  return base32Encode(randomBytes(20));
}

/** URI otpauth:// padrão (Key URI Format do Google Authenticator) para entrada manual num app autenticador. */
export function totpUri(secret: string, accountEmail: string): string {
  const issuer = "Turminha da Tata";
  const label = encodeURIComponent(`${issuer}:${accountEmail}`);
  const params = new URLSearchParams({ secret, issuer, algorithm: "SHA1", digits: String(DIGITS), period: String(STEP_SECONDS) });
  return `otpauth://totp/${label}?${params.toString()}`;
}

/**
 * Confere um código de 6 dígitos contra o segredo, aceitando o passo atual e um passo de tolerância
 * para cada lado (±30s) — compensa pequena divergência de relógio entre o celular e o servidor sem
 * abrir uma janela grande demais. Comparação em tempo constante (timingSafeEqual) para não vazar
 * quanto do código está certo por diferença de tempo de resposta.
 */
export function verifyTotpCode(secret: string, code: string, nowMs = Date.now(), windowSteps = 1): boolean {
  const trimmed = code.trim();
  if (!/^\d{6}$/.test(trimmed)) return false;

  const keyBytes = base32Decode(secret);
  const currentCounter = Math.floor(nowMs / 1000 / STEP_SECONDS);
  const codeBuffer = Buffer.from(trimmed);

  for (let step = -windowSteps; step <= windowSteps; step++) {
    const candidate = Buffer.from(hotp(keyBytes, currentCounter + step));
    if (candidate.length === codeBuffer.length && timingSafeEqual(candidate, codeBuffer)) {
      return true;
    }
  }
  return false;
}
