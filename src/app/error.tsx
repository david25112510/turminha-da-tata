"use client";

import Image from "next/image";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[#FFFBF2] p-6 text-center">
      <div className="relative w-32 h-40">
        <Image src="/images/tata-mascote.png" alt="" fill className="object-contain" />
      </div>
      <h1 className="font-[family-name:var(--font-baloo)] font-semibold text-xl text-[#2E2418]">
        Algo deu errado
      </h1>
      <p className="text-sm text-[#6B5D4A] max-w-xs">
        Não conseguimos carregar esta página agora. Tente novamente em instantes.
      </p>
      <button
        type="button"
        onClick={reset}
        className="min-h-11 px-6 bg-[#FF6F8E] text-white rounded-xl font-[family-name:var(--font-baloo)] font-semibold text-sm"
      >
        Tentar novamente
      </button>
    </main>
  );
}
