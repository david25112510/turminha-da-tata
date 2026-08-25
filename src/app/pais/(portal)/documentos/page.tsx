import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireGuardian } from "@/lib/guardian";
import { formatDateTime } from "@/lib/date";
import { EmptyState } from "@/components/tata/EmptyState";

export const dynamic = "force-dynamic";

export default async function GuardianDocumentsPage() {
  const guardian = await requireGuardian();

  const accepted = await prisma.contractAcceptance.findMany({
    where: { guardianId: guardian.id, status: "ACCEPTED" },
    include: { child: true, version: true },
    orderBy: { acceptedAt: "desc" },
  });

  return (
    <div className="p-4 sm:p-6 flex flex-col gap-5 max-w-2xl mx-auto">
      <h1 className="font-[family-name:var(--font-baloo)] font-semibold text-xl text-tata-ink">📄 Documentos</h1>

      {accepted.length === 0 ? (
        <div className="bg-tata-surface rounded-tata-lg shadow-tata-card">
          <EmptyState message="Nenhum contrato assinado ainda." withMascot />
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {accepted.map((a) => (
            <Link
              key={a.id}
              href={`/pais/documentos/${a.id}`}
              className="bg-tata-surface rounded-tata-lg shadow-tata-card p-4 flex flex-col gap-1 min-h-11 hover:shadow-tata-card-hover active:scale-[0.99] transition-all"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-tata-ink text-sm">
                  Contrato — {a.child.preferredName || a.child.fullName}
                </span>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-tata-green/10 text-tata-green-dark shrink-0">
                  🟢 Aceito
                </span>
              </div>
              <span className="text-xs text-tata-ink-muted">
                Versão {a.version.version}
                {a.acceptedAt && ` — aceito em ${formatDateTime(a.acceptedAt)}`}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
