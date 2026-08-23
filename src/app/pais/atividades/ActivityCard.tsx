import { ACTIVITY_CATEGORY_LABELS } from "@/lib/labels";
import { Card } from "@/components/tata/Card";

type ActivityCardProps = {
  category: keyof typeof ACTIVITY_CATEGORY_LABELS;
  date: Date;
  description: string | null;
  delayMs?: number;
};

export function ActivityCard({ category, date, description, delayMs = 0 }: ActivityCardProps) {
  return (
    <Card accent="lilac" animate style={{ animationDelay: `${delayMs}ms` }}>
      <div className="flex items-center justify-between">
        <span className="font-[family-name:var(--font-baloo)] font-semibold text-sm text-tata-ink">
          🎨 {ACTIVITY_CATEGORY_LABELS[category]}
        </span>
        <span className="text-xs text-tata-ink-muted">{new Intl.DateTimeFormat("pt-BR").format(date)}</span>
      </div>
      {description && <p className="text-sm text-tata-ink-soft mt-1">{description}</p>}
    </Card>
  );
}
