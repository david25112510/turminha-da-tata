import { formatTime } from "@/lib/date";
import type { TimelineEntry } from "@/lib/journey";
import { EmptyState } from "@/components/tata/EmptyState";

// Mesmo mapa de ícones de src/app/pais/GuardianRoutineTimeline.tsx — duplicado de propósito (mesmo
// princípio que aquele componente já usa para TimelineEntry: cada papel controla sua própria exibição).
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

export function RoutineTimeline({ entries }: { entries: TimelineEntry[] }) {
  if (entries.length === 0) {
    return <EmptyState message="Nenhum registro hoje ainda." withMascot />;
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
