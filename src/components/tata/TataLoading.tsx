"use client";

import { useEffect, useState } from "react";
import { TataScene } from "./TataScene";

export type TataLoadingContext = "LOGIN" | "SAVE" | "SUBMIT" | "ENROLLMENT" | "DOCUMENT" | "PHOTO" | "PAYMENT" | "ROUTINE" | "MEDICATION";
export type TataLoadingLevel = "micro" | "contextual" | "immersive";

const messages: Record<TataLoadingContext, string> = {
  LOGIN: "Entrando...", SAVE: "Salvando alterações...", SUBMIT: "Enviando solicitação...",
  ENROLLMENT: "Enviando matrícula...", DOCUMENT: "Registrando aceite...", PHOTO: "Enviando foto...",
  PAYMENT: "Processando...", ROUTINE: "Registrando momento...", MEDICATION: "Registrando administração...",
};

function useDelayedVisibility(active: boolean, delay = 250, minimum = 550) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (active && !visible) timer = setTimeout(() => setVisible(true), delay);
    if (!active && visible) timer = setTimeout(() => setVisible(false), minimum);
    return () => clearTimeout(timer);
  }, [active, delay, minimum, visible]);
  return visible;
}

export function TataLoading({ active, context, message, level = "immersive" }: { active: boolean; context: TataLoadingContext; message?: string; level?: TataLoadingLevel }) {
  const visible = useDelayedVisibility(active, level === "micro" ? 120 : 250, level === "micro" ? 250 : 550);
  const label = message ?? messages[context];
  if (!visible) return null;
  if (level === "micro") return <span role="status" aria-live="polite" className="inline-flex items-center gap-2 text-sm font-semibold"><span className="size-2 animate-pulse rounded-full bg-current" aria-hidden="true" />{label}</span>;

  const content = <div className={`relative overflow-hidden rounded-3xl border border-tata-border bg-tata-surface shadow-tata-card ${level === "immersive" ? "w-[min(88vw,360px)] p-5" : "w-full p-3"}`} role="status" aria-live="polite" aria-busy="true"><div className={`relative mx-auto ${level === "immersive" ? "h-52 w-44" : "h-24 w-20"}`}><TataScene scene="LOADING_HEART" alt="Tata formando um coração com as mãos" className="tata-loading-character" /></div><span className="tata-loading-heart" aria-hidden="true">♥</span><p className="mt-2 text-center font-[family-name:var(--font-baloo)] font-semibold text-tata-ink">{label}</p></div>;
  return level === "immersive" ? <div className="fixed inset-0 z-[100] grid place-items-center bg-tata-ink/20 p-4" aria-label={label}>{content}</div> : content;
}
