import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireGuardian } from "@/lib/guardian";
import { EmptyState } from "@/components/tata/EmptyState";
import { markAllNotificationsReadAction } from "./actions";
import { NotificationCard } from "./NotificationCard";

const PAGE_SIZE = 20;

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
        <h1 className="font-[family-name:var(--font-baloo)] font-semibold text-xl text-tata-ink">
          🔔 Notificações
        </h1>
        {unreadCount > 0 && (
          <form action={markAllNotificationsReadAction}>
            <button type="submit" className="min-h-11 text-xs font-semibold text-tata-green">
              Marcar todas como lidas
            </button>
          </form>
        )}
      </div>

      {page.length === 0 ? (
        <EmptyState message="Nenhuma notificação por enquanto 💛" withMascot />
      ) : (
        <div className="flex flex-col gap-2.5">
          {page.map((n, i) => (
            <NotificationCard
              key={n.id}
              id={n.id}
              type={n.type}
              title={n.title}
              body={n.body}
              createdAt={n.createdAt}
              read={n.read}
              delayMs={Math.min(i, 8) * 30}
            />
          ))}
        </div>
      )}

      {hasMore && (
        <Link
          href={`/pais/notificacoes?limit=${limit + PAGE_SIZE}`}
          className="min-h-11 flex items-center justify-center bg-tata-surface border border-tata-border text-tata-ink-soft rounded-xl font-semibold text-sm"
        >
          Carregar mais
        </Link>
      )}
    </div>
  );
}
