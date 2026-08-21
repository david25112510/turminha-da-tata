import Link from "next/link";
import Image from "next/image";
import { auth, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import { requireGuardian } from "@/lib/guardian";
import { PushNotificationToggle } from "./PushNotificationToggle";

const NAV_ITEMS = [
  { href: "/pais", label: "Início" },
  { href: "/pais/jornada", label: "Jornada" },
  { href: "/pais/fotos", label: "Fotos" },
  { href: "/pais/atividades", label: "Atividades" },
  { href: "/pais/comunicados", label: "Comunicados" },
  { href: "/pais/agenda", label: "Agenda" },
  { href: "/pais/financeiro", label: "Financeiro" },
];

export default async function GuardianLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const guardian = await requireGuardian();
  const unreadCount = await prisma.notification.count({
    where: { guardianId: guardian.id, read: false },
  });

  return (
    <div className="min-h-screen flex flex-col bg-[#FDF8EE]">
      <header className="flex items-center justify-between px-6 py-4 bg-[#FFFDF8] border-b border-[#ECE1CB]">
        <Link href="/pais" className="flex items-baseline gap-1.5 font-[family-name:var(--font-baloo)] font-bold text-lg">
          <span className="text-[#1FA787]">Turminha</span>
          <span className="text-[#FF6F8E]">Tata</span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="px-3 py-1.5 rounded-full text-sm font-semibold text-[#6B5D4A] hover:bg-[#F3EEE1] transition-colors"
            >
              {item.label}
              {item.href === "/pais" && unreadCount > 0 && (
                <span className="ml-1.5 bg-[#E85570] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {unreadCount}
                </span>
              )}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <div className="relative w-7 h-9 shrink-0">
            <Image src="/images/tata-mascote.png" alt="" fill className="object-contain" />
          </div>
          <div className="text-sm font-semibold text-[#3A2E22]">{session?.user.name}</div>
          <PushNotificationToggle />
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

      <nav className="flex md:hidden items-center gap-1 px-4 py-2 bg-[#FFFDF8] border-b border-[#ECE1CB] overflow-x-auto">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="px-3 py-1.5 rounded-full text-xs font-semibold text-[#6B5D4A] hover:bg-[#F3EEE1] whitespace-nowrap"
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <main className="flex-1">{children}</main>
    </div>
  );
}
