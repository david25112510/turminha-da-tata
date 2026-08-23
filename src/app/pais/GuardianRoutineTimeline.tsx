import { formatTime } from "@/lib/date";

export type TimelineEntry = { time: Date; label: string; detail: string };

const ICONS: Record<string, string> = {
  Chegada: "🟢",
  Saída: "🔵",
  Soneca: "😴",
  Higiene: "🧼",
  Atividade: "🎨",
  Humor: "😊",
  Saúde: "🩺",
  Ocorrência: "⚠️",
  Medicamento: "💊",
  Foto: "📷",
};

function iconFor(label: string) {
  return ICONS[label] ?? "🍎"; // refeições têm rótulo dinâmico (Café da manhã, Almoço...) — cai aqui
}

/** Mesmo shape de TimelineEntry usado pela cuidadora (src/lib/journey.ts) — não duplica a lógica, só a exibição. */
export function GuardianRoutineTimeline({ entries }: { entries: TimelineEntry[] }) {
  if (entries.length === 0) {
    return <p className="text-sm text-[#8A7A62]">Nenhum registro por enquanto.</p>;
  }

  return (
    <ol className="flex flex-col gap-3.5">
      {entries.map((entry, i) => (
        <li key={i} className="flex gap-3 items-start text-sm">
          <span className="text-lg shrink-0" aria-hidden="true">{iconFor(entry.label)}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-semibold text-[#2E2418]">{entry.label}</span>
              <span className="font-mono text-xs text-[#9A8A72] shrink-0">{formatTime(entry.time)}</span>
            </div>
            <p className="text-[#6B5D4A]">{entry.detail}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
