import Link from "next/link";
import Image from "next/image";
import { auth, signOut } from "@/auth";
import { BottomNav } from "./BottomNav";
import { OfflineBanner } from "./OfflineBanner";

export default async function CaregiverLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  return (
    <div className="min-h-screen flex flex-col bg-tata-surface-alt">
      <OfflineBanner />

      <header className="flex items-center justify-between px-4 sm:px-6 py-3 bg-tata-surface border-b border-tata-border">
        <Link href="/cuidadora" className="flex flex-col leading-tight">
          <span className="flex items-baseline gap-1.5 font-[family-name:var(--font-baloo)] font-bold text-lg">
            <span className="text-tata-green">Turminha</span>
            <span className="text-tata-coral">Tata</span>
          </span>
          <span className="text-[10px] font-semibold text-tata-ink-muted tracking-wide uppercase">Área da cuidadora</span>
        </Link>

        <div className="flex items-center gap-3">
          <div className="relative w-7 h-9 shrink-0 hidden sm:block">
            <Image src="/images/tata-mascote.png" alt="" fill className="object-contain" />
          </div>
          <div className="text-sm font-semibold text-tata-ink-deep hidden sm:block">{session?.user.name}</div>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button type="submit" className="min-h-11 px-2 text-xs font-semibold text-tata-coral-dark">
              Sair
            </button>
          </form>
        </div>
      </header>

      <main className="flex-1 pb-20 md:pb-0">{children}</main>

      <BottomNav />
    </div>
  );
}
