import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ROLE_LABELS } from "@/lib/labels";
import { toggleUserActiveAction } from "./actions";

export default async function SettingsPage() {
  const session = await auth();
  const users = await prisma.user.findMany({
    orderBy: [{ role: "asc" }, { name: "asc" }],
    select: { id: true, name: true, email: true, role: true, active: true },
  });

  return (
    <div className="p-8 flex flex-col gap-6 max-w-3xl">
      <h1 className="font-[family-name:var(--font-baloo)] font-semibold text-xl text-tata-ink">
        Configurações
      </h1>

      <div className="bg-tata-surface rounded-2xl shadow-sm p-5">
        <span className="font-[family-name:var(--font-baloo)] font-semibold text-base text-tata-ink block mb-3">
          Usuários do sistema
        </span>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-tata-ink-muted border-b border-tata-border">
              <th className="py-2 font-semibold">Nome</th>
              <th className="py-2 font-semibold">E-mail</th>
              <th className="py-2 font-semibold">Papel</th>
              <th className="py-2 font-semibold">Status</th>
              <th className="py-2 font-semibold"></th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-b border-tata-surface-hover last:border-0">
                <td className="py-2.5 text-tata-ink font-medium">{user.name}</td>
                <td className="py-2.5 text-tata-ink-soft">{user.email}</td>
                <td className="py-2.5 text-tata-ink-soft">{ROLE_LABELS[user.role]}</td>
                <td className="py-2.5">
                  <span
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                      user.active ? "bg-tata-green/10 text-tata-green-dark" : "bg-tata-ink-muted/10 text-tata-ink-muted"
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
                      <button type="submit" className="text-xs font-semibold text-tata-green hover:underline">
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
