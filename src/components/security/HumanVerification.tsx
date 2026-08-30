"use client";
import Script from "next/script";
import { useEffect, useId, useRef, useState } from "react";

declare global { interface Window { turnstile?: { render: (target: string, options: Record<string, unknown>) => string; reset: (id: string) => void; remove: (id: string) => void } } }
const TEST_SITE_KEY = "1x00000000000000000000AA";

export function HumanVerification({ pending = false }: { pending?: boolean }) {
  const id = `turnstile-${useId().replace(/:/g, "")}`;
  const widgetId = useRef<string | null>(null); const wasPending = useRef(false); const [loaded, setLoaded] = useState(false);
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? (process.env.NODE_ENV !== "production" ? TEST_SITE_KEY : "");
  useEffect(() => {
    if (!loaded || !siteKey || !window.turnstile || widgetId.current) return;
    widgetId.current = window.turnstile.render(`#${id}`, { sitekey: siteKey, theme: "auto", size: "flexible", appearance: "interaction-only", "response-field-name": "cf-turnstile-response" });
    return () => { if (widgetId.current && window.turnstile) window.turnstile.remove(widgetId.current); widgetId.current = null; };
  }, [id, loaded, siteKey]);
  useEffect(() => { if (wasPending.current && !pending && widgetId.current && window.turnstile) window.turnstile.reset(widgetId.current); wasPending.current = pending; }, [pending]);
  return <div className="flex min-h-[70px] flex-col justify-center" aria-label="Verificação de segurança"><Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" strategy="afterInteractive" onLoad={() => setLoaded(true)} />{siteKey ? <div id={id} /> : <p role="alert" className="text-sm text-tata-coral-dark">Verificação de segurança indisponível.</p>}</div>;
}
