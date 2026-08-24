import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { EmptyState } from "@/components/tata/EmptyState";

export default async function CaregiversListPage() {
  const caregivers = await prisma.user.findMany({
    where: { role: "CAREGIVER" },
    orderBy: { name: "asc" },
    select: { id: true, name: true, email: true, phone: true, active: true },
  });

  return (
    <div className="p-4 sm:p-8 flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-[family-name:var(--font-baloo)] font-semibold text-xl text-tata-ink">
          Cuidadoras
        </h1>
        <Link
          href="/admin/cuidadoras/nova"
          className="min-h-11 flex items-center bg-tata-coral text-white text-sm font-semibold rounded-xl px-4 font-[family-name:var(--font-baloo)]"
        >
          + Nova cuidadora
        </Link>
      </div>

      {caregivers.length === 0 ? (
        <div className="bg-tata-surface rounded-2xl shadow-sm">
          <EmptyState message="Nenhuma cuidadora cadastrada ainda." withMascot />
        </div>
      ) : (
        <>
          {/* Mobile: cards */}
          <div className="flex flex-col gap-2.5 md:hidden">
            {caregivers.map((c) => (
              <Link
                key={c.id}
                href={`/admin/cuidadoras/${c.id}`}
                className="bg-tata-surface rounded-2xl shadow-sm p-4 flex flex-col gap-1 min-h-11"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-tata-ink text-sm">{c.name}</span>
                  <span
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                      c.active ? "bg-tata-green/10 text-tata-green-dark" : "bg-tata-ink-muted/10 text-tata-ink-muted"
                    }`}
                  >
                    {c.active ? "Ativa" : "Inativa"}
                  </span>
                </div>
                <span className="text-xs text-tata-ink-soft">{c.email}</span>
                {c.phone && <span className="text-xs text-tata-ink-muted">{c.phone}</span>}
              </Link>
            ))}
          </div>

          {/* Desktop: table */}
          <div className="hidden md:block bg-tata-surface rounded-2xl shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-tata-ink-muted border-b border-tata-border">
                  <th className="p-4 font-semibold">Nome</th>
                  <th className="p-4 font-semibold">E-mail</th>
                  <th className="p-4 font-semibold">Telefone</th>
                  <th className="p-4 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {caregivers.map((c) => (
                  <tr key={c.id} className="border-b border-tata-surface-hover last:border-0">
                    <td className="p-4 font-medium text-tata-ink">
                      <Link href={`/admin/cuidadoras/${c.id}`} className="hover:underline">
                        {c.name}
                      </Link>
                    </td>
                    <td className="p-4 text-tata-ink-soft">{c.email}</td>
                    <td className="p-4 text-tata-ink-soft">{c.phone || "—"}</td>
                    <td className="p-4">
                      <span
                        className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                          c.active ? "bg-tata-green/10 text-tata-green-dark" : "bg-tata-ink-muted/10 text-tata-ink-muted"
                        }`}
                      >
                        {c.active ? "Ativa" : "Inativa"}
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
