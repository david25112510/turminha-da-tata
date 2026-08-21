import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ROLE_LABELS } from "@/lib/labels";
import { toggleUserActiveAction } from "./actions";

export default async function SettingsPage() {
  const session = await auth();
  const users = await prisma.user.findMany({ orderBy: [{ role: "asc" }, { name: "asc" }] });

  return (
    <div className="p-8 flex flex-col gap-6 max-w-3xl">
      <h1 className="font-[family-name:var(--font-baloo)] font-semibold text-xl text-[#2E2418]">
        Configurações
      </h1>

      <div className="bg-[#FFFDF8] rounded-2xl shadow-sm p-5">
        <span className="font-[family-name:var(--font-baloo)] font-semibold text-base text-[#2E2418] block mb-3">
          Usuários do sistema
        </span>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-[#9A8A72] border-b border-[#ECE1CB]">
              <th className="py-2 font-semibold">Nome</th>
              <th className="py-2 font-semibold">E-mail</th>
              <th className="py-2 font-semibold">Papel</th>
              <th className="py-2 font-semibold">Status</th>
              <th className="py-2 font-semibold"></th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-b border-[#F3EEE1] last:border-0">
                <td className="py-2.5 text-[#2E2418] font-medium">{user.name}</td>
                <td className="py-2.5 text-[#6B5D4A]">{user.email}</td>
                <td className="py-2.5 text-[#6B5D4A]">{ROLE_LABELS[user.role]}</td>
                <td className="py-2.5">
                  <span
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                      user.active ? "bg-[#1FA787]/10 text-[#1F8A6E]" : "bg-[#9A8A72]/10 text-[#9A8A72]"
                    }`}
                  >
                    {user.active ? "Ativo" : "Inativo"}
                  </span>
                </td>
                <td className="py-2.5">
                  {user.id !== session?.user.id && (
                    <form action={toggleUserActiveAction}>
                      <input type="hidden" name="userId" value={user.id} />
                      <input type="hidden" name="currentActive" value={String(user.active)} />
                      <button type="submit" className="text-xs font-semibold text-[#1FA787] hover:underline">
                        {user.active ? "Desativar" : "Reativar"}
                      </button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
