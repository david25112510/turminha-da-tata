import { getAuditLogEntries, getOperationalTimeline, type AuditEntry } from "@/lib/audit";
import { formatTime } from "@/lib/date";

const inputClass =
  "min-h-11 border border-tata-border rounded-xl px-3 py-2 text-sm outline-none focus:border-tata-green transition-colors bg-tata-surface";

function toDateInput(d: Date) {
  return d.toISOString().slice(0, 10);
}

function EntryList({ entries, emptyLabel }: { entries: AuditEntry[]; emptyLabel: string }) {
  if (entries.length === 0) return <p className="text-sm text-tata-ink-muted-alt">{emptyLabel}</p>;
  return (
    <ol className="flex flex-col gap-3">
      {entries.map((entry, i) => (
        <li key={i} className="text-sm border-b border-tata-surface-hover pb-2.5 last:border-0">
          <div className="flex justify-between text-xs text-tata-ink-muted">
            <span>{new Intl.DateTimeFormat("pt-BR").format(entry.time)} — {formatTime(entry.time)}</span>
            <span className="font-semibold">{entry.actorName}</span>
          </div>
          <p className="text-tata-ink">
            {entry.action}
            {entry.childName && <span className="text-tata-ink-soft"> — {entry.childName}</span>}
          </p>
        </li>
      ))}
    </ol>
  );
}

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { from, to } = await searchParams;

  const end = to ? new Date(`${to}T23:59:59`) : new Date();
  const start = from ? new Date(`${from}T00:00:00`) : new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [securityEntries, operationalEntries] = await Promise.all([
    getAuditLogEntries(start, end),
    getOperationalTimeline(start, end),
  ]);

  return (
    <div className="p-4 sm:p-8 flex flex-col gap-6 max-w-3xl">
      <h1 className="font-[family-name:var(--font-baloo)] font-semibold text-xl text-tata-ink">
        Histórico e auditoria
      </h1>

      <form className="flex gap-3 items-end">
        <label className="flex flex-col gap-1 text-xs text-tata-ink-soft">
          De
          <input type="date" name="from" defaultValue={toDateInput(start)} className={inputClass} />
        </label>
        <label className="flex flex-col gap-1 text-xs text-tata-ink-soft">
          Até
          <input type="date" name="to" defaultValue={toDateInput(end)} className={inputClass} />
        </label>
        <button type="submit" className="min-h-11 bg-tata-green text-white rounded-xl px-4 py-2 text-sm font-semibold font-[family-name:var(--font-baloo)]">
          Filtrar
        </button>
      </form>

      <section className="flex flex-col gap-3">
        <div>
          <h2 className="font-[family-name:var(--font-baloo)] font-semibold text-base text-tata-ink">
            Auditoria administrativa
          </h2>
          <p className="text-xs text-tata-ink-muted">
            Alterações de segurança, cadastro, permissões e financeiro — quem fez, o quê, e o valor antes/depois.
          </p>
        </div>
        <div className="bg-tata-surface rounded-2xl shadow-sm p-5">
          <EntryList entries={securityEntries} emptyLabel="Nenhuma alteração administrativa no período." />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <div>
          <h2 className="font-[family-name:var(--font-baloo)] font-semibold text-base text-tata-ink">
            Histórico operacional
          </h2>
          <p className="text-xs text-tata-ink-muted">
            Rotina das crianças — chegada, saída, alimentação, sono, higiene, atividades, ocorrências e fotos.
          </p>
        </div>
        <div className="bg-tata-surface rounded-2xl shadow-sm p-5">
          <EntryList entries={operationalEntries} emptyLabel="Nenhuma atividade no período." />
        </div>
      </section>
    </div>
  );
}
