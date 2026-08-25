import Image from "next/image";
import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-4 bg-tata-bg p-6 text-center">
      <div className="relative w-32 h-40 tata-mascot-idle">
        <Image src="/images/tata-mascote.png" alt="" fill className="object-contain" />
      </div>
      <h1 className="font-[family-name:var(--font-baloo)] font-semibold text-xl text-tata-ink">
        Não encontramos esta página
      </h1>
      <p className="text-sm text-tata-ink-soft max-w-xs">
        O endereço pode ter mudado ou não existe mais. Vamos voltar para um lugar conhecido?
      </p>
      <Link
        href="/"
        className="min-h-11 flex items-center px-6 bg-tata-coral text-white rounded-xl font-[family-name:var(--font-baloo)] font-semibold text-sm"
      >
        Voltar ao início
      </Link>
    </main>
  );
}
