"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen flex flex-col items-center justify-center gap-4 bg-tata-bg p-6 text-center">
        <h1 className="font-semibold text-xl text-tata-ink">Algo deu errado</h1>
        <p className="text-sm text-tata-ink-soft max-w-xs">
          Não conseguimos carregar o Turminha da Tata agora. Tente novamente em instantes.
        </p>
        <button
          type="button"
          onClick={reset}
          className="min-h-11 px-6 bg-tata-coral text-white rounded-xl font-semibold text-sm"
        >
          Tentar novamente
        </button>
      </body>
    </html>
  );
}
