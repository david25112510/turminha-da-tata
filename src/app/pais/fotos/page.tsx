import { prisma } from "@/lib/prisma";
import { requireGuardian, pickChildLink } from "@/lib/guardian";
import { ChildSwitcher } from "../ChildSwitcher";
import { PhotoGallery } from "../PhotoGallery";

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
    <div className="p-4 sm:p-6 flex flex-col gap-5 max-w-3xl mx-auto">
      <ChildSwitcher basePath="/pais/fotos" activeChildId={link.childId} guardianChildren={guardian.children} />

      <h1 className="font-[family-name:var(--font-baloo)] font-semibold text-xl text-[#2E2418]">
        📷 Momentos — {link.child.preferredName || link.child.fullName}
      </h1>

      {photos.length === 0 ? (
        <p className="text-sm text-[#8A7A62]">Nenhuma foto disponível ainda.</p>
      ) : (
        <PhotoGallery photos={photos} />
      )}
    </div>
  );
}
