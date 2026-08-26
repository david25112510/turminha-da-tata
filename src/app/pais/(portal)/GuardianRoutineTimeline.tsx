import { formatTime } from "@/lib/date";
import { EmptyState } from "@/components/tata/EmptyState";

export type TimelineEntry = { time: Date; label: string; detail: string };

const ICONS: Record<string, string> = {
  Chegada: "💛",
  Saída: "🔵",
  Soneca: "😴",
  Higiene: "🧼",
  Água: "💧",
  Atividade: "🎨",
  Humor: "😊",
  Saúde: "🩺",
  Ocorrência: "⚠️",
  Medicamento: "💊",
  Foto: "📷",
  Observação: "📝",
  "Observação da família": "📝",
};

function iconFor(label: string) {
  return ICONS[label] ?? "🍎"; // refeições têm rótulo dinâmico (Café da manhã, Almoço...) — cai aqui
}

/**
 * Timeline como narrativa do dia — linha vertical conectando os momentos, ícone em destaque e horário
 * junto ao ícone (em vez de alinhado à direita) para reforçar a leitura "às 07:34, chegou". Mesmo
 * TimelineEntry de src/lib/journey.ts, usado também pela cuidadora — só a exibição muda aqui.
 */
export function GuardianRoutineTimeline({ entries }: { entries: TimelineEntry[] }) {
  if (entries.length === 0) {
    return <EmptyState message="Hoje ainda não temos registros por aqui 💛" withMascot />;
  }

  return (
    <ol className="relative flex flex-col gap-5 pl-1">
      <div aria-hidden="true" className="absolute left-[19px] top-2 bottom-2 w-px bg-tata-border" />
      {entries.map((entry, i) => (
        <li key={i} className="relative flex gap-3.5 items-start text-sm tata-animate-in" style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}>
          <span
            aria-hidden="true"
            className="relative z-10 shrink-0 w-10 h-10 rounded-full bg-tata-surface shadow-tata-card flex items-center justify-center text-lg"
          >
            {iconFor(entry.label)}
          </span>
          <div className="flex-1 min-w-0 pt-1.5">
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-xs font-semibold text-tata-green-dark">{formatTime(entry.time)}</span>
              <span className="font-semibold text-tata-ink">{entry.label}</span>
            </div>
            <p className="text-tata-ink-soft">{entry.detail}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
