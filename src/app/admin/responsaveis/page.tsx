import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { RELATIONSHIP_LABELS } from "@/lib/labels";
import { DeleteConfirmDialog } from "@/components/tata/DeleteConfirmDialog";
import { deleteGuardianAction } from "./actions";

export default async function GuardiansListPage() {
  const guardians = await prisma.guardian.findMany({
    orderBy: { name: "asc" },
    include: {
      children: { include: { child: true } },
      consentAcceptances: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  return (
    <div className="p-4 sm:p-8 flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-[family-name:var(--font-baloo)] font-semibold text-xl text-tata-ink">
          Responsáveis
        </h1>
        <Link
          href="/admin/responsaveis/novo"
          className="min-h-11 flex items-center bg-tata-coral text-white text-sm font-semibold rounded-xl px-4 font-[family-name:var(--font-baloo)]"
        >
          + Novo responsável
        </Link>
      </div>

      {guardians.length === 0 ? (
        <div className="bg-tata-surface rounded-2xl shadow-sm p-8 text-center text-sm text-tata-ink-muted-alt">
          Nenhum responsável cadastrado ainda.
        </div>
      ) : (
        <>
          {/* Mobile: cards */}
          <div className="flex flex-col gap-2.5 md:hidden">
            {guardians.map((guardian) => (
              <div key={guardian.id} className="bg-tata-surface rounded-2xl shadow-sm p-4 flex flex-col gap-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-tata-ink text-sm">{guardian.name}</span>
                  <div className="flex flex-wrap gap-1.5 justify-end shrink-0">
                    <span
                      className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                        guardian.userId
                          ? "bg-tata-green/10 text-tata-green-dark"
                          : "bg-tata-ink-muted/10 text-tata-ink-muted"
                      }`}
                    >
                      {guardian.userId ? "Ativo" : "Sem acesso"}
                    </span>
                    <span
                      className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                        guardian.consentAcceptances[0]?.status === "ACCEPTED"
                          ? "bg-tata-green/10 text-tata-green-dark"
                          : "bg-tata-yellow/10 text-tata-yellow-dark"
                      }`}
                    >
                      LGPD {guardian.consentAcceptances[0]?.status === "ACCEPTED" ? "🟢" : "🟡"}
                    </span>
                  </div>
                </div>
                <span className="text-xs text-tata-ink-soft">{guardian.phone}</span>
                <span className="text-xs text-tata-ink-muted">
                  {guardian.children
                    .map((gc) => `${gc.child.preferredName || gc.child.fullName} (${RELATIONSHIP_LABELS[gc.relationship]})`)
                    .join(", ") || "—"}
                </span>
                <div className="flex justify-end mt-1">
                  <DeleteConfirmDialog
                    action={deleteGuardianAction}
                    hiddenFields={{ id: guardian.id }}
                    entityLabel="responsável"
                    entityName={guardian.name}
                    warning={
                      guardian.children.length > 0
                        ? "Os vínculos com as crianças serão removidos, mas o histórico delas (presença, medicamentos etc.) é preservado."
                        : undefined
                    }
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Desktop: table */}
          <div className="hidden md:block bg-tata-surface rounded-2xl shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-tata-ink-muted border-b border-tata-border">
                  <th className="p-4 font-semibold">Nome</th>
                  <th className="p-4 font-semibold">Contato</th>
                  <th className="p-4 font-semibold">Vinculado a</th>
                  <th className="p-4 font-semibold">Acesso ao portal</th>
                  <th className="p-4 font-semibold">Consentimento LGPD</th>
                  <th className="p-4 font-semibold"></th>
                </tr>
              </thead>
              <tbody>
                {guardians.map((guardian) => (
                  <tr key={guardian.id} className="border-b border-tata-surface-hover last:border-0">
                    <td className="p-4 font-medium text-tata-ink">{guardian.name}</td>
                    <td className="p-4 text-tata-ink-soft">{guardian.phone}</td>
                    <td className="p-4 text-tata-ink-soft">
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
                            ? "bg-tata-green/10 text-tata-green-dark"
                            : "bg-tata-ink-muted/10 text-tata-ink-muted"
                        }`}
                      >
                        {guardian.userId ? "Ativo" : "Sem acesso"}
                      </span>
                    </td>
                    <td className="p-4">
                      <span
                        className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                          guardian.consentAcceptances[0]?.status === "ACCEPTED"
                            ? "bg-tata-green/10 text-tata-green-dark"
                            : "bg-tata-yellow/10 text-tata-yellow-dark"
                        }`}
                      >
                        {guardian.consentAcceptances[0]?.status === "ACCEPTED" ? "🟢 Aceito" : "🟡 Pendente"}
                      </span>
                    </td>
                    <td className="p-4">
                      <DeleteConfirmDialog
                        action={deleteGuardianAction}
                        hiddenFields={{ id: guardian.id }}
                        entityLabel="responsável"
                        entityName={guardian.name}
                        warning={
                          guardian.children.length > 0
                            ? "Os vínculos com as crianças serão removidos, mas o histórico delas (presença, medicamentos etc.) é preservado."
                            : undefined
                        }
                      />
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
