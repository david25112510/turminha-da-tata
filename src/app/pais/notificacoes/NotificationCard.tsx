import { markNotificationReadAction } from "./actions";

const TYPE_ICON: Record<string, string> = {
  ARRIVAL: "💛",
  DEPARTURE: "💛",
  MEAL: "🍎",
  SLEEP: "😴",
  PHOTO: "📷",
  INCIDENT: "⚠️",
  ANNOUNCEMENT: "📣",
  FINANCIAL: "💰",
  MEDICATION: "💊",
};

function formatWhen(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(date);
}

type NotificationCardProps = {
  id: string;
  type: string;
  title: string;
  body: string;
  createdAt: Date;
  read: boolean;
  delayMs?: number;
};

export function NotificationCard({ id, type, title, body, createdAt, read, delayMs = 0 }: NotificationCardProps) {
  return (
    <div
      className={`rounded-tata-lg shadow-tata-card p-4 flex gap-3 tata-animate-in ${
        read ? "bg-tata-surface" : "bg-tata-green-soft border border-tata-green/25"
      }`}
      style={{ animationDelay: `${delayMs}ms` }}
    >
      <span className="text-xl shrink-0" aria-hidden="true">{TYPE_ICON[type] ?? "🔔"}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-2">
          <span className="font-semibold text-tata-ink text-sm">{title}</span>
          {!read && <span className="w-2 h-2 rounded-full bg-tata-green shrink-0" aria-label="Não lida" />}
        </div>
        <p className="text-sm text-tata-ink-soft">{body}</p>
        <div className="flex items-center justify-between mt-1.5">
          <span className="text-xs text-tata-ink-muted">{formatWhen(createdAt)}</span>
          {!read && (
            <form action={markNotificationReadAction}>
              <input type="hidden" name="id" value={id} />
              <button type="submit" className="min-h-11 text-xs font-semibold text-tata-green">
                Marcar como lida
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
