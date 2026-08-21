import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { RELATIONSHIP_LABELS } from "@/lib/labels";

export default async function GuardiansListPage() {
  const guardians = await prisma.guardian.findMany({
    orderBy: { name: "asc" },
    include: { children: { include: { child: true } } },
  });

  return (
    <div className="p-8 flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-[family-name:var(--font-baloo)] font-semibold text-xl text-[#2E2418]">
          Responsáveis
        </h1>
        <Link
          href="/admin/responsaveis/novo"
          className="bg-[#FF6F8E] text-white text-sm font-semibold rounded-xl px-4 py-2.5 font-[family-name:var(--font-baloo)]"
        >
          + Novo responsável
        </Link>
      </div>

      <div className="bg-[#FFFDF8] rounded-2xl shadow-sm overflow-hidden">
        {guardians.length === 0 ? (
          <div className="p-8 text-center text-sm text-[#8A7A62]">
            Nenhum responsável cadastrado ainda.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-[#9A8A72] border-b border-[#ECE1CB]">
                <th className="p-4 font-semibold">Nome</th>
                <th className="p-4 font-semibold">Contato</th>
                <th className="p-4 font-semibold">Vinculado a</th>
                <th className="p-4 font-semibold">Acesso ao portal</th>
              </tr>
            </thead>
            <tbody>
              {guardians.map((guardian) => (
                <tr key={guardian.id} className="border-b border-[#F3EEE1] last:border-0">
                  <td className="p-4 font-medium text-[#2E2418]">{guardian.name}</td>
                  <td className="p-4 text-[#6B5D4A]">{guardian.phone}</td>
                  <td className="p-4 text-[#6B5D4A]">
                    {guardian.children
                      .map(
                        (gc) =>
                          `${gc.child.preferredName || gc.child.fullName} (${RELATIONSHIP_LABELS[gc.relationship]})`
                      )
                      .join(", ") || "—"}
                  </td>
                  <td className="p-4">
                    <span
                      className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                        guardian.userId
                          ? "bg-[#1FA787]/10 text-[#1F8A6E]"
                          : "bg-[#9A8A72]/10 text-[#9A8A72]"
                      }`}
                    >
                      {guardian.userId ? "Ativo" : "Sem acesso"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
