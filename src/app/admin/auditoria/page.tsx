import { getAuditLogEntries, getOperationalTimeline, type AuditEntry } from "@/lib/audit";
import { formatTime } from "@/lib/date";

const inputClass =
  "border border-[#ECE1CB] rounded-xl px-3 py-2 text-sm outline-none focus:border-[#1FA787] transition-colors bg-white";

function toDateInput(d: Date) {
  return d.toISOString().slice(0, 10);
}

function EntryList({ entries, emptyLabel }: { entries: AuditEntry[]; emptyLabel: string }) {
  if (entries.length === 0) return <p className="text-sm text-[#8A7A62]">{emptyLabel}</p>;
  return (
    <ol className="flex flex-col gap-3">
      {entries.map((entry, i) => (
        <li key={i} className="text-sm border-b border-[#F3EEE1] pb-2.5 last:border-0">
          <div className="flex justify-between text-xs text-[#9A8A72]">
            <span>{new Intl.DateTimeFormat("pt-BR").format(entry.time)} — {formatTime(entry.time)}</span>
            <span className="font-semibold">{entry.actorName}</span>
          </div>
          <p className="text-[#2E2418]">
            {entry.action}
            {entry.childName && <span className="text-[#6B5D4A]"> — {entry.childName}</span>}
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
    <div className="p-8 flex flex-col gap-6 max-w-3xl">
      <h1 className="font-[family-name:var(--font-baloo)] font-semibold text-xl text-[#2E2418]">
        Histórico e auditoria
      </h1>

      <form className="flex gap-3 items-end">
        <label className="flex flex-col gap-1 text-xs text-[#6B5D4A]">
          De
          <input type="date" name="from" defaultValue={toDateInput(start)} className={inputClass} />
        </label>
        <label className="flex flex-col gap-1 text-xs text-[#6B5D4A]">
          Até
          <input type="date" name="to" defaultValue={toDateInput(end)} className={inputClass} />
        </label>
        <button type="submit" className="bg-[#1FA787] text-white rounded-xl px-4 py-2 text-sm font-semibold font-[family-name:var(--font-baloo)]">
          Filtrar
        </button>
      </form>

      <section className="flex flex-col gap-3">
        <div>
          <h2 className="font-[family-name:var(--font-baloo)] font-semibold text-base text-[#2E2418]">
            Auditoria administrativa
          </h2>
          <p className="text-xs text-[#9A8A72]">
            Alterações de segurança, cadastro, permissões e financeiro — quem fez, o quê, e o valor antes/depois.
          </p>
        </div>
        <div className="bg-[#FFFDF8] rounded-2xl shadow-sm p-5">
          <EntryList entries={securityEntries} emptyLabel="Nenhuma alteração administrativa no período." />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <div>
          <h2 className="font-[family-name:var(--font-baloo)] font-semibold text-base text-[#2E2418]">
            Histórico operacional
          </h2>
          <p className="text-xs text-[#9A8A72]">
            Rotina das crianças — chegada, saída, alimentação, sono, higiene, atividades, ocorrências e fotos.
          </p>
        </div>
        <div className="bg-[#FFFDF8] rounded-2xl shadow-sm p-5">
          <EntryList entries={operationalEntries} emptyLabel="Nenhuma atividade no período." />
        </div>
      </section>
    </div>
  );
}
