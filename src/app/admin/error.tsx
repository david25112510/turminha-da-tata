"use client";

import Image from "next/image";

/** Mantém o layout do admin (sidebar/header) visível ao redor do erro — só o conteúdo é substituído. */
export default function AdminError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="p-4 sm:p-8 flex flex-col items-center justify-center gap-4 text-center min-h-[60vh]">
      <div className="relative w-24 h-30">
        <Image src="/images/tata-mascote.png" alt="" fill className="object-contain" />
      </div>
      <h1 className="font-[family-name:var(--font-baloo)] font-semibold text-lg text-tata-ink">
        Algo deu errado
      </h1>
      <p className="text-sm text-tata-ink-soft max-w-xs">
        Não conseguimos carregar esta informação agora. Tente novamente em instantes.
      </p>
      <button
        type="button"
        onClick={reset}
        className="min-h-11 px-6 bg-tata-coral text-white rounded-xl font-[family-name:var(--font-baloo)] font-semibold text-sm"
      >
        Tentar novamente
      </button>
    </div>
  );
}
