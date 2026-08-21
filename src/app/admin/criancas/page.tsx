import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { CHILD_STATUS_LABELS } from "@/lib/labels";

export default async function ChildrenListPage() {
  const children = await prisma.child.findMany({
    orderBy: { fullName: "asc" },
  });

  return (
    <div className="p-8 flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-[family-name:var(--font-baloo)] font-semibold text-xl text-[#2E2418]">
          Crianças
        </h1>
        <Link
          href="/admin/criancas/nova"
          className="bg-[#FF6F8E] text-white text-sm font-semibold rounded-xl px-4 py-2.5 font-[family-name:var(--font-baloo)]"
        >
          + Nova criança
        </Link>
      </div>

      <div className="bg-[#FFFDF8] rounded-2xl shadow-sm overflow-hidden">
        {children.length === 0 ? (
          <div className="p-8 text-center text-sm text-[#8A7A62]">
            Nenhuma criança cadastrada ainda.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-[#9A8A72] border-b border-[#ECE1CB]">
                <th className="p-4 font-semibold">Nome</th>
                <th className="p-4 font-semibold">Nascimento</th>
                <th className="p-4 font-semibold">Mensalidade</th>
                <th className="p-4 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {children.map((child) => (
                <tr key={child.id} className="border-b border-[#F3EEE1] last:border-0 hover:bg-[#FBF6EA]">
                  <td className="p-4 font-medium text-[#2E2418]">
                    <Link href={`/admin/criancas/${child.id}`} className="hover:text-[#1FA787]">
                      {child.preferredName || child.fullName}
                    </Link>
                  </td>
                  <td className="p-4 text-[#6B5D4A]">
                    {new Intl.DateTimeFormat("pt-BR").format(child.birthDate)}
                  </td>
                  <td className="p-4 text-[#6B5D4A]">
                    {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
                      Number(child.monthlyFee)
                    )}
                  </td>
                  <td className="p-4">
                    <span
                      className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                        child.status === "ACTIVE"
                          ? "bg-[#1FA787]/10 text-[#1F8A6E]"
                          : "bg-[#E85570]/10 text-[#E85570]"
                      }`}
                    >
                      {CHILD_STATUS_LABELS[child.status]}
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
