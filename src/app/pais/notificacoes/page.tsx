import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireGuardian } from "@/lib/guardian";
import { markAllNotificationsReadAction, markNotificationReadAction } from "./actions";

const PAGE_SIZE = 20;

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

export default async function GuardianNotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ limit?: string }>;
}) {
  const { limit: limitParam } = await searchParams;
  const guardian = await requireGuardian();
  const limit = Math.max(PAGE_SIZE, Number(limitParam) || PAGE_SIZE);

  // Busca uma a mais só para saber se existe próxima página, sem contar o total (evita outra query).
  const notifications = await prisma.notification.findMany({
    where: { guardianId: guardian.id },
    orderBy: { createdAt: "desc" },
    take: limit + 1,
  });
  const hasMore = notifications.length > limit;
  const page = notifications.slice(0, limit);
  const unreadCount = page.filter((n) => !n.read).length;

  return (
    <div className="p-4 sm:p-6 flex flex-col gap-5 max-w-2xl mx-auto">
      <div className="flex items-center justify-between gap-2">
        <h1 className="font-[family-name:var(--font-baloo)] font-semibold text-xl text-[#2E2418]">
          🔔 Notificações
        </h1>
        {unreadCount > 0 && (
          <form action={markAllNotificationsReadAction}>
            <button type="submit" className="min-h-11 text-xs font-semibold text-[#1FA787]">
              Marcar todas como lidas
            </button>
          </form>
        )}
      </div>

      {page.length === 0 ? (
        <p className="text-sm text-[#8A7A62]">Nenhuma notificação por enquanto.</p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {page.map((n) => (
            <div
              key={n.id}
              className={`rounded-2xl shadow-sm p-4 flex gap-3 ${n.read ? "bg-[#FFFDF8]" : "bg-[#1FA787]/5 border border-[#1FA787]/20"}`}
            >
              <span className="text-xl shrink-0" aria-hidden="true">{TYPE_ICON[n.type] ?? "🔔"}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-semibold text-[#2E2418] text-sm">{n.title}</span>
                  {!n.read && <span className="w-2 h-2 rounded-full bg-[#1FA787] shrink-0" aria-label="Não lida" />}
                </div>
                <p className="text-sm text-[#6B5D4A]">{n.body}</p>
                <div className="flex items-center justify-between mt-1.5">
                  <span className="text-xs text-[#9A8A72]">{formatWhen(n.createdAt)}</span>
                  {!n.read && (
                    <form action={markNotificationReadAction}>
                      <input type="hidden" name="id" value={n.id} />
                      <button type="submit" className="min-h-11 text-xs font-semibold text-[#1FA787]">
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

      {hasMore && (
        <Link
          href={`/pais/notificacoes?limit=${limit + PAGE_SIZE}`}
          className="min-h-11 flex items-center justify-center bg-white border border-[#ECE1CB] text-[#6B5D4A] rounded-xl font-semibold text-sm"
        >
          Carregar mais
        </Link>
      )}
    </div>
  );
}
