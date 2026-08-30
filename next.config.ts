import type { NextConfig } from "next";

function remotePatternsFromPublicUrl() {
  const publicUrl = process.env.STORAGE_S3_ENDPOINT || process.env.STORAGE_S3_PUBLIC_URL;
  if (!publicUrl) return [];
  try {
    const { protocol, hostname } = new URL(publicUrl);
    return [{ protocol: protocol.replace(":", "") as "http" | "https", hostname }];
  } catch {
    return [];
  }
}

/** Origin (schema://host, sem caminho) do bucket S3/R2 configurado, para liberar no img-src do CSP. */
function storageOrigin(): string | null {
  const publicUrl = process.env.STORAGE_S3_ENDPOINT || process.env.STORAGE_S3_PUBLIC_URL;
  if (!publicUrl) return null;
  try {
    return new URL(publicUrl).origin;
  } catch {
    return null;
  }
}

/**
 * CSP pragmática, não baseada em nonce: `script-src 'self' 'unsafe-inline'` é necessário porque o
 * App Router do Next injeta um <script> inline para transportar o payload de streaming do RSC
 * (`self.__next_f.push(...)`) — bloqueá-lo quebraria a hidratação. Uma CSP com nonce eliminaria essa
 * necessidade, mas exigiria propagar um nonce por requisição (proxy.ts → root layout), mudança maior
 * fora do escopo desta rodada. Mesmo assim, a política concreta libera apenas a origem oficial do
 * Cloudflare Turnstile para script, conexão e iframe, restringe as demais origens e nega enquadramento
 * da aplicação por outro site (`frame-ancestors`).
 *
 * `'unsafe-eval'` só em desenvolvimento — o React usa eval() para reconstruir call stacks entre
 * servidor/cliente nas mensagens de erro de dev (nunca em produção); confirmado bloqueando de
 * verdade a suíte E2E antes desta condicional (ver node_modules/next/dist/docs/.../content-security-
 * policy.md, "Good to know" sobre unsafe-eval em dev).
 */
function contentSecurityPolicy(): string {
  const storage = storageOrigin();
  const imgSrc = ["'self'", "data:", "blob:", storage].filter(Boolean).join(" ");
  const isDev = process.env.NODE_ENV !== "production";
  const turnstileOrigin = "https://challenges.cloudflare.com";

  return [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline' ${turnstileOrigin}${isDev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    `img-src ${imgSrc}`,
    "font-src 'self' data:",
    `connect-src 'self' ${turnstileOrigin}`,
    `frame-src ${turnstileOrigin}`,
    "manifest-src 'self'",
    "worker-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ].join("; ");
}

const nextConfig: NextConfig = {
  images: {
    remotePatterns: remotePatternsFromPublicUrl(),
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: contentSecurityPolicy() },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
