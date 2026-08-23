import { formatTime } from "@/lib/date";
import type { TimelineEntry } from "@/lib/journey";

export function RoutineTimeline({ entries }: { entries: TimelineEntry[] }) {
  if (entries.length === 0) {
    return <p className="text-sm text-tata-ink-muted-alt">Nenhum registro hoje ainda.</p>;
  }

  return (
    <ol className="flex flex-col gap-3">
      {entries.map((entry, i) => (
        <li key={i} className="flex gap-3 items-start text-sm">
          <span className="font-mono text-xs text-tata-ink-muted w-12 shrink-0 pt-0.5">{formatTime(entry.time)}</span>
          <div>
            <span className="font-semibold text-tata-ink">{entry.label}</span>
            <span className="text-tata-ink-soft"> — {entry.detail}</span>
          </div>
        </li>
      ))}
    </ol>
  );
}
