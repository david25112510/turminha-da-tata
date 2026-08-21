import Link from "next/link";
import Image from "next/image";
import { auth, signOut } from "@/auth";

const NAV_ITEMS = [
  { href: "/admin", label: "Início" },
  { href: "/admin/criancas", label: "Crianças" },
  { href: "/admin/responsaveis", label: "Responsáveis" },
  { href: "/admin/comunicados", label: "Comunicados" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  return (
    <div className="min-h-screen flex bg-[#FDF8EE]">
      <aside className="w-[232px] bg-[#FFFDF8] border-r border-[#ECE1CB] flex flex-col gap-6 p-5 shrink-0">
        <div className="flex items-baseline gap-1.5 font-[family-name:var(--font-baloo)] font-bold text-lg px-2">
          <span className="text-[#1FA787]">Turminha</span>
          <span className="text-[#FF6F8E]">Tata</span>
        </div>

        <nav className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-4 py-2.5 rounded-2xl text-sm font-semibold text-[#6B5D4A] hover:bg-[#F3EEE1] transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="mt-auto flex items-center gap-2.5 p-2.5 bg-[#FFF7E1] rounded-2xl">
          <div className="relative w-8 h-11 shrink-0">
            <Image src="/images/tata-mascote.png" alt="" fill className="object-contain" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold text-[#3A2E22] truncate">
              {session?.user.name}
            </div>
            <div className="text-[10px] text-[#8A7A62]">Administradora</div>
          </div>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button
              type="submit"
              className="text-[10px] font-semibold text-[#E85570] hover:underline"
            >
              Sair
            </button>
          </form>
        </div>
      </aside>

      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}
