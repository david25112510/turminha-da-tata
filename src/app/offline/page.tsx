import Image from "next/image";

export default function OfflinePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[#FFFBF2] p-6 text-center">
      <div className="relative w-32 h-40">
        <Image src="/images/tata-mascote.png" alt="" fill className="object-contain" />
      </div>
      <h1 className="font-[family-name:var(--font-baloo)] font-semibold text-xl text-[#2E2418]">
        Você está sem conexão
      </h1>
      <p className="text-sm text-[#6B5D4A] max-w-xs">
        Verifique sua internet e tente novamente. Assim que a conexão voltar, o app volta ao normal.
      </p>
    </main>
  );
}
