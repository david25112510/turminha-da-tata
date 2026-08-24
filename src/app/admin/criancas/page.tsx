import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { CHILD_STATUS_LABELS } from "@/lib/labels";

const currency = (n: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);

export default async function ChildrenListPage() {
  const children = await prisma.child.findMany({
    orderBy: { fullName: "asc" },
  });

  return (
    <div className="p-4 sm:p-8 flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-[family-name:var(--font-baloo)] font-semibold text-xl text-tata-ink">
          Crianças
        </h1>
        <Link
          href="/admin/criancas/nova"
          className="min-h-11 flex items-center bg-tata-coral text-white text-sm font-semibold rounded-xl px-4 font-[family-name:var(--font-baloo)]"
        >
          + Nova criança
        </Link>
      </div>

      {children.length === 0 ? (
        <div className="bg-tata-surface rounded-2xl shadow-sm p-8 text-center text-sm text-tata-ink-muted-alt">
          Nenhuma criança cadastrada ainda.
        </div>
      ) : (
        <>
          {/* Mobile: cards */}
          <div className="flex flex-col gap-2.5 md:hidden">
            {children.map((child) => (
              <Link
                key={child.id}
                href={`/admin/criancas/${child.id}`}
                className="bg-tata-surface rounded-2xl shadow-sm p-4 flex flex-col gap-1 min-h-11"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-tata-ink text-sm">{child.preferredName || child.fullName}</span>
                  <span
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                      child.status === "ACTIVE"
                        ? "bg-tata-green/10 text-tata-green-dark"
                        : "bg-tata-coral-dark/10 text-tata-coral-dark"
                    }`}
                  >
                    {CHILD_STATUS_LABELS[child.status]}
                  </span>
                </div>
                <span className="text-xs text-tata-ink-soft">
                  Nascimento: {new Intl.DateTimeFormat("pt-BR").format(child.birthDate)}
                </span>
                <span className="text-xs text-tata-ink-muted">Mensalidade: {currency(Number(child.monthlyFee))}</span>
              </Link>
            ))}
          </div>

          {/* Desktop: table */}
          <div className="hidden md:block bg-tata-surface rounded-2xl shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-tata-ink-muted border-b border-tata-border">
                  <th className="p-4 font-semibold">Nome</th>
                  <th className="p-4 font-semibold">Nascimento</th>
                  <th className="p-4 font-semibold">Mensalidade</th>
                  <th className="p-4 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {children.map((child) => (
                  <tr key={child.id} className="border-b border-tata-surface-hover last:border-0 hover:bg-tata-surface-warm">
                    <td className="p-4 font-medium text-tata-ink">
                      <Link href={`/admin/criancas/${child.id}`} className="hover:text-tata-green">
                        {child.preferredName || child.fullName}
                      </Link>
                    </td>
                    <td className="p-4 text-tata-ink-soft">
                      {new Intl.DateTimeFormat("pt-BR").format(child.birthDate)}
                    </td>
                    <td className="p-4 text-tata-ink-soft">{currency(Number(child.monthlyFee))}</td>
                    <td className="p-4">
                      <span
                        className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                          child.status === "ACTIVE"
                            ? "bg-tata-green/10 text-tata-green-dark"
                            : "bg-tata-coral-dark/10 text-tata-coral-dark"
                        }`}
                      >
                        {CHILD_STATUS_LABELS[child.status]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
