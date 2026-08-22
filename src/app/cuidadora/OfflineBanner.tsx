"use client";

import { useEffect, useState } from "react";

/** Detecta perda de conexão e avisa a cuidadora — não implementa fila offline, só evita silêncio/confusão. */
export function OfflineBanner() {
  const [online, setOnline] = useState(() => (typeof navigator === "undefined" ? true : navigator.onLine));

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  if (online) return null;

  return (
    <div role="status" className="bg-[#E85570] text-white text-xs font-semibold text-center py-1.5 px-3">
      Sem conexão — verifique sua internet. O que você preencher não será perdido, mas só será salvo ao reconectar.
    </div>
  );
}
