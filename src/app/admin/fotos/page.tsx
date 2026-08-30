import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { EmptyState } from "@/components/tata/EmptyState";
import { removePhotoAction } from "./actions";
import { resolveStoredFileUrl } from "@/lib/storage";

const dateTimeFmt = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" });

export default async function AdminPhotosPage({
  searchParams,
}: {
  searchParams: Promise<{ childId?: string }>;
}) {
  const { childId } = await searchParams;

  const [children, photos] = await Promise.all([
    prisma.child.findMany({ where: { status: "ACTIVE" }, orderBy: { fullName: "asc" }, select: { id: true, fullName: true, preferredName: true } }),
    prisma.photo.findMany({
      where: childId ? { childId } : undefined,
      orderBy: { takenAt: "desc" },
      take: 60,
      include: { child: true, uploadedBy: true },
    }),
  ]);

  const visiblePhotos = await Promise.all(photos.map(async (photo) => ({ ...photo, url: (await resolveStoredFileUrl(photo.url))! })));

  return (
    <div className="p-4 sm:p-8 flex flex-col gap-6">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h1 className="font-[family-name:var(--font-baloo)] font-semibold text-xl text-tata-ink">Fotos / Mural</h1>

        <form className="flex items-center gap-2">
          <select
            name="childId"
            defaultValue={childId ?? ""}
            className="min-h-11 border border-tata-border rounded-xl px-3 py-2 text-sm bg-tata-surface"
          >
            <option value="">Todas as crianças</option>
            {children.map((c) => (
              <option key={c.id} value={c.id}>
                {c.preferredName || c.fullName}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="min-h-11 bg-tata-surface border border-tata-border text-tata-ink-soft text-sm font-semibold rounded-xl px-4"
          >
            Filtrar
          </button>
        </form>
      </div>

      {photos.length === 0 ? (
        <div className="bg-tata-surface rounded-2xl shadow-sm">
          <EmptyState message="Nenhuma foto encontrada." withMascot />
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {visiblePhotos.map((photo) => (
            <div key={photo.id} className="bg-tata-surface rounded-2xl shadow-sm overflow-hidden flex flex-col">
              <div className="relative w-full aspect-square bg-tata-surface-hover">
                <Image src={photo.url} alt={photo.caption || "Foto"} fill unoptimized className="object-cover" />
              </div>
              <div className="p-3 flex flex-col gap-1">
                <p className="text-xs font-semibold text-tata-ink truncate">
                  {photo.child.preferredName || photo.child.fullName}
                </p>
                {photo.caption && <p className="text-xs text-tata-ink-soft line-clamp-2">{photo.caption}</p>}
                <p className="text-[10px] text-tata-ink-muted">
                  {dateTimeFmt.format(photo.takenAt)} · {photo.uploadedBy?.name ?? "—"}
                </p>

                <details className="mt-1">
                  <summary className="text-xs font-semibold text-tata-coral-dark cursor-pointer">Remover</summary>
                  <form action={removePhotoAction} className="flex flex-col gap-1.5 mt-1.5">
                    <input type="hidden" name="id" value={photo.id} />
                    <input
                      name="reason"
                      required
                      placeholder="Motivo da remoção"
                      className="min-h-11 border border-tata-border rounded-lg px-2 py-1.5 text-xs bg-tata-surface"
                    />
                    <button
                      type="submit"
                      className="min-h-11 bg-tata-coral-dark text-white text-xs font-semibold rounded-lg py-2"
                    >
                      Confirmar remoção
                    </button>
                  </form>
                </details>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
