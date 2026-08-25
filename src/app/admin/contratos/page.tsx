import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/date";
import { EmptyState } from "@/components/tata/EmptyState";
import { publishNewVersionAction } from "./actions";

const inputClass =
  "min-h-11 border border-tata-border rounded-xl px-3 py-2 text-sm outline-none focus:border-tata-green transition-colors bg-tata-surface";

const STATUS_LABELS: Record<string, string> = { PENDING: "🟡 Pendente", ACCEPTED: "🟢 Aceito", CANCELLED: "🔴 Cancelado" };
const STATUS_TONE: Record<string, string> = {
  PENDING: "bg-tata-yellow/10 text-tata-yellow-dark",
  ACCEPTED: "bg-tata-green/10 text-tata-green-dark",
  CANCELLED: "bg-tata-coral/10 text-tata-coral-dark",
};

export default async function AdminContractsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; from?: string; to?: string }>;
}) {
  const { q, status, from, to } = await searchParams;

  const [acceptances, currentVersion] = await Promise.all([
    prisma.contractAcceptance.findMany({
      where: {
        ...(status ? { status: status as never } : {}),
        ...(from || to
          ? {
              createdAt: {
                ...(from ? { gte: new Date(`${from}T00:00:00`) } : {}),
                ...(to ? { lte: new Date(`${to}T23:59:59`) } : {}),
              },
            }
          : {}),
        ...(q
          ? {
              OR: [
                { child: { fullName: { contains: q, mode: "insensitive" } } },
                { guardian: { name: { contains: q, mode: "insensitive" } } },
              ],
            }
          : {}),
      },
      include: { child: true, guardian: true, version: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.contractVersion.findFirst({ where: { status: "PUBLISHED" }, orderBy: { createdAt: "desc" } }),
  ]);

  return (
    <div className="p-4 sm:p-8 flex flex-col gap-6 max-w-3xl">
      <h1 className="font-[family-name:var(--font-baloo)] font-semibold text-xl text-tata-ink">Contratos</h1>

      <form className="flex flex-wrap gap-3 items-end">
        <label className="flex flex-col gap-1 text-xs text-tata-ink-soft flex-1 min-w-40">
          Buscar
          <input type="text" name="q" defaultValue={q} placeholder="Criança ou responsável" className={inputClass} />
        </label>
        <label className="flex flex-col gap-1 text-xs text-tata-ink-soft">
          Status
          <select name="status" defaultValue={status ?? ""} className={inputClass}>
            <option value="">Todos</option>
            <option value="PENDING">🟡 Pendente</option>
            <option value="ACCEPTED">🟢 Aceito</option>
            <option value="CANCELLED">🔴 Cancelado</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-tata-ink-soft">
          De
          <input type="date" name="from" defaultValue={from} className={inputClass} />
        </label>
        <label className="flex flex-col gap-1 text-xs text-tata-ink-soft">
          Até
          <input type="date" name="to" defaultValue={to} className={inputClass} />
        </label>
        <button type="submit" className="min-h-11 bg-tata-green text-white rounded-xl px-4 py-2 text-sm font-semibold font-[family-name:var(--font-baloo)]">
          Filtrar
        </button>
      </form>

      <section className="flex flex-col gap-3">
        {acceptances.length === 0 ? (
          <div className="bg-tata-surface rounded-tata-lg shadow-tata-card">
            <EmptyState message="Nenhum contrato encontrado." />
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {acceptances.map((a) => (
              <Link
                key={a.id}
                href={`/admin/contratos/${a.id}`}
                className="bg-tata-surface rounded-tata-lg shadow-tata-card p-4 flex flex-col gap-1 min-h-11 hover:shadow-tata-card-hover active:scale-[0.99] transition-all"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-tata-ink text-sm">
                    {a.child.preferredName || a.child.fullName}
                  </span>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${STATUS_TONE[a.status]}`}>
                    {STATUS_LABELS[a.status]}
                  </span>
                </div>
                <span className="text-xs text-tata-ink-soft">Responsável: {a.guardian.name}</span>
                <span className="text-xs text-tata-ink-muted">
                  Versão {a.version.version}
                  {a.acceptedAt && ` — aceito em ${formatDateTime(a.acceptedAt)}`}
                  {a.signatureUrl && " · ✍️ assinado"}
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <div>
          <h2 className="font-[family-name:var(--font-baloo)] font-semibold text-base text-tata-ink">
            Nova versão do contrato
          </h2>
          <p className="text-xs text-tata-ink-muted">
            Versão publicada atual: {currentVersion?.version ?? "nenhuma ainda"}. Publicar uma nova versão gera
            pendência de aceite para todo responsável com vínculo ativo — os aceites de versões anteriores continuam
            registrados no histórico.
          </p>
        </div>
        <form action={publishNewVersionAction} className="flex flex-col gap-3">
          <textarea
            name="content"
            defaultValue={currentVersion?.content ?? ""}
            required
            rows={14}
            className={`${inputClass} font-mono text-xs leading-relaxed`}
          />
          <button
            type="submit"
            className="self-start min-h-11 bg-tata-coral-dark text-white rounded-xl px-6 text-sm font-semibold font-[family-name:var(--font-baloo)]"
          >
            Publicar nova versão
          </button>
        </form>
      </section>
    </div>
  );
}
