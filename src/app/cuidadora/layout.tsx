import Link from "next/link";
import Image from "next/image";
import { auth, signOut } from "@/auth";

export default async function CaregiverLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  return (
    <div className="min-h-screen flex flex-col bg-[#FDF8EE]">
      <header className="flex items-center justify-between px-6 py-4 bg-[#FFFDF8] border-b border-[#ECE1CB]">
        <Link href="/cuidadora" className="flex items-baseline gap-1.5 font-[family-name:var(--font-baloo)] font-bold text-lg">
          <span className="text-[#1FA787]">Turminha</span>
          <span className="text-[#FF6F8E]">Tata</span>
        </Link>

        <div className="flex items-center gap-3">
          <div className="relative w-7 h-9 shrink-0">
            <Image src="/images/tata-mascote.png" alt="" fill className="object-contain" />
          </div>
          <div className="text-sm font-semibold text-[#3A2E22]">{session?.user.name}</div>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button type="submit" className="text-xs font-semibold text-[#E85570] hover:underline">
              Sair
            </button>
          </form>
        </div>
      </header>

      <main className="flex-1">{children}</main>
    </div>
  );
}
