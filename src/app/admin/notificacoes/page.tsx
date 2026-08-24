import { prisma } from "@/lib/prisma";
import { EmptyState } from "@/components/tata/EmptyState";
import { markAdminNotificationReadAction, markAllAdminNotificationsReadAction } from "./actions";

const TYPE_ICON: Record<string, string> = {
  INCIDENT: "⚠️",
  MEDICATION: "💊",
  INVOICE_OVERDUE: "💰",
  CAREGIVER_CREATED: "👩🏾‍🏫",
};

function formatWhen(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(date);
}

export default async function AdminNotificationsPage() {
  const notifications = await prisma.adminNotification.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="p-4 sm:p-8 flex flex-col gap-6 max-w-2xl">
      <div className="flex items-center justify-between gap-2">
        <h1 className="font-[family-name:var(--font-baloo)] font-semibold text-xl text-tata-ink">
          🔔 Notificações
        </h1>
        {unreadCount > 0 && (
          <form action={markAllAdminNotificationsReadAction}>
            <button type="submit" className="min-h-11 text-xs font-semibold text-tata-green">
              Marcar todas como lidas
            </button>
          </form>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="bg-tata-surface rounded-2xl shadow-sm">
          <EmptyState message="Nenhuma notificação por enquanto." withMascot />
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`rounded-2xl shadow-sm p-4 flex gap-3 ${
                n.read ? "bg-tata-surface" : "bg-tata-green-soft border border-tata-green/25"
              }`}
            >
              <span className="text-xl shrink-0" aria-hidden="true">{TYPE_ICON[n.type] ?? "🔔"}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-semibold text-tata-ink text-sm">{n.title}</span>
                  {!n.read && <span className="w-2 h-2 rounded-full bg-tata-green shrink-0" aria-label="Não lida" />}
                </div>
                <p className="text-sm text-tata-ink-soft">{n.body}</p>
                <div className="flex items-center justify-between mt-1.5">
                  <span className="text-xs text-tata-ink-muted">{formatWhen(n.createdAt)}</span>
                  {!n.read && (
                    <form action={markAdminNotificationReadAction}>
                      <input type="hidden" name="id" value={n.id} />
                      <button type="submit" className="min-h-11 text-xs font-semibold text-tata-green">
                        Marcar como lida
                      </button>
                    </form>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
