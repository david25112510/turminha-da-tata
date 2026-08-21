import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { requireGuardian, pickChildLink } from "@/lib/guardian";
import { ChildSwitcher } from "../ChildSwitcher";

export default async function GuardianPhotosPage({
  searchParams,
}: {
  searchParams: Promise<{ childId?: string }>;
}) {
  const { childId } = await searchParams;
  const guardian = await requireGuardian();
  const link = pickChildLink(guardian.children, childId);

  if (!link) {
    return <div className="p-8 text-sm text-[#8A7A62]">Nenhuma criança vinculada à sua conta.</div>;
  }

  if (!link.viewPhotos || !link.child.imageAuthorized) {
    return (
      <div className="p-8 text-sm text-[#8A7A62]">
        Não há fotos disponíveis para visualização.
      </div>
    );
  }

  const photos = await prisma.photo.findMany({
    where: { childId: link.childId },
    orderBy: { takenAt: "desc" },
    take: 60,
  });

  return (
    <div className="p-6 flex flex-col gap-5 max-w-3xl mx-auto">
      <ChildSwitcher basePath="/pais/fotos" activeChildId={link.childId} children={guardian.children} />

      <h1 className="font-[family-name:var(--font-baloo)] font-semibold text-xl text-[#2E2418]">
        Fotos — {link.child.preferredName || link.child.fullName}
      </h1>

      {photos.length === 0 ? (
        <p className="text-sm text-[#8A7A62]">Nenhuma foto publicada ainda.</p>
      ) : (
        <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
          {photos.map((photo) => (
            <div key={photo.id} className="flex flex-col gap-1">
              <div className="relative aspect-square rounded-2xl overflow-hidden bg-[#F3EEE1]">
                <Image src={photo.url} alt={photo.caption ?? ""} fill sizes="200px" className="object-cover" />
              </div>
              {photo.caption && <span className="text-xs text-[#8A7A62]">{photo.caption}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
