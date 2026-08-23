"use client";

import { useSyncExternalStore } from "react";

function subscribe(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

function getClientSnapshot() {
  return navigator.onLine;
}

// O servidor não sabe a conectividade do dispositivo — assume online para casar com o request que já chegou
// até ele. useSyncExternalStore troca para o valor real do cliente logo após a hidratação, sem warning de
// mismatch (diferente de ler navigator.onLine direto num useState inicial, que pode divergir do SSR e quebrar
// a hidratação quando o dispositivo já abre offline — ex.: PWA aberto sem conexão).
function getServerSnapshot() {
  return true;
}

/** Detecta perda de conexão e avisa (cuidadora e pais) — não implementa fila offline, só evita silêncio/confusão. */
export function OfflineBanner() {
  const online = useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);

  if (online) return null;

  return (
    <div role="status" className="bg-tata-coral-dark text-white text-xs font-semibold text-center py-1.5 px-3">
      Sem conexão — verifique sua internet. O que você preencher não será perdido, mas só será salvo ao reconectar.
    </div>
  );
}
