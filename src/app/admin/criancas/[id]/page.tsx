import Image from "next/image";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { RELATIONSHIP_LABELS, CHILD_STATUS_LABELS } from "@/lib/labels";
import { uploadChildPhotoAction } from "@/lib/photo-actions";
import { buildTimeline } from "@/lib/journey";
import { todayRange, formatTime } from "@/lib/date";
import { addAuthorizedPersonAction, toggleAuthorizedPersonStatusAction } from "./actions";

const inputClass =
  "border border-tata-border rounded-xl px-3 py-2 text-sm outline-none focus:border-tata-green transition-colors bg-tata-surface";
const cardClass = "bg-tata-surface rounded-2xl shadow-sm p-5 flex flex-col gap-4";
const cardTitle = "font-[family-name:var(--font-baloo)] font-semibold text-base text-tata-ink";

export default async function ChildDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: childId } = await params;

  const child = await prisma.child.findUnique({
    where: { id: childId },
    include: {
      guardians: { include: { guardian: true } },
      authorizedPickupPeople: { orderBy: { createdAt: "desc" } },
      photos: { orderBy: { takenAt: "desc" }, take: 12 },
    },
  });
  if (!child) notFound();

  const { start, end } = todayRange();
  const timeline = await buildTimeline(childId, start, end);

  return (
    <div className="p-4 sm:p-8 flex flex-col gap-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-[family-name:var(--font-baloo)] font-semibold text-xl text-tata-ink">
            {child.preferredName || child.fullName}
          </h1>
          <p className="text-sm text-tata-ink-muted-alt">{child.fullName}</p>
        </div>
        <span
          className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
            child.status === "ACTIVE" ? "bg-tata-green/10 text-tata-green-dark" : "bg-tata-coral-dark/10 text-tata-coral-dark"
          }`}
        >
          {CHILD_STATUS_LABELS[child.status]}
        </span>
      </div>

      <div className={cardClass}>
        <span className={cardTitle}>Rotina de hoje</span>
        {timeline.length === 0 ? (
          <p className="text-sm text-tata-ink-muted-alt">Nenhum registro de rotina ainda hoje.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {timeline.map((entry, i) => (
              <li key={i} className="text-sm flex items-baseline gap-3 border-b border-tata-surface-hover pb-2 last:border-0">
                <span className="text-tata-ink-muted text-xs shrink-0 w-12">{formatTime(entry.time)}</span>
                <span className="font-medium text-tata-ink shrink-0">{entry.label}</span>
                <span className="text-tata-ink-soft">{entry.detail}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className={cardClass}>
        <span className={cardTitle}>Responsáveis</span>
        {child.guardians.length === 0 ? (
          <p className="text-sm text-tata-ink-muted-alt">Nenhum responsável vinculado.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {child.guardians.map((gc) => (
              <li key={gc.id} className="text-sm flex items-center justify-between border-b border-tata-surface-hover pb-2 last:border-0">
                <span className="font-medium text-tata-ink">
                  {gc.guardian.name} — {RELATIONSHIP_LABELS[gc.relationship]}
                  {gc.isPrimary && <span className="ml-2 text-xs text-tata-green-dark">principal</span>}
                  {gc.isFinancialResponsible && <span className="ml-2 text-xs text-tata-ink-muted">financeiro</span>}
                </span>
                <span className="text-tata-ink-soft">{gc.guardian.phone}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className={cardClass}>
        <span className={cardTitle}>Pessoas autorizadas a retirar</span>

        {child.authorizedPickupPeople.length === 0 ? (
          <p className="text-sm text-tata-ink-muted-alt">Nenhuma pessoa autorizada cadastrada.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {child.authorizedPickupPeople.map((person) => (
              <li
                key={person.id}
                className="text-sm flex items-center justify-between border-b border-tata-surface-hover pb-2 last:border-0"
              >
                <div>
                  <span className="font-medium text-tata-ink">
                    {person.name} — {RELATIONSHIP_LABELS[person.relationship]}
                  </span>
                  <span className="text-tata-ink-soft ml-2">{person.phone}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      person.status === "ACTIVE"
                        ? "bg-tata-green/10 text-tata-green-dark"
                        : "bg-tata-ink-muted/10 text-tata-ink-muted"
                    }`}
                  >
                    {person.status === "ACTIVE" ? "Ativo" : "Inativo"}
                  </span>
                  <form action={toggleAuthorizedPersonStatusAction}>
                    <input type="hidden" name="id" value={person.id} />
                    <input type="hidden" name="childId" value={childId} />
                    <input type="hidden" name="currentStatus" value={person.status} />
                    <button type="submit" className="text-xs font-semibold text-tata-green hover:underline">
                      {person.status === "ACTIVE" ? "Desativar" : "Reativar"}
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}

        <form action={addAuthorizedPersonAction} className="grid grid-cols-2 gap-3 pt-2 border-t border-tata-border">
          <input type="hidden" name="childId" value={childId} />
          <input name="name" placeholder="Nome completo" required className={inputClass} />
          <input name="phone" placeholder="Telefone" required className={inputClass} />
          <input name="cpf" placeholder="CPF" className={inputClass} />
          <select name="relationship" className={inputClass} defaultValue="OTHER">
            {Object.entries(RELATIONSHIP_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
          <select name="authorizedByGuardianId" required className={`${inputClass} col-span-2`} defaultValue="">
            <option value="" disabled>Autorizado por qual responsável?</option>
            {child.guardians.map((gc) => (
              <option key={gc.guardian.id} value={gc.guardian.id}>{gc.guardian.name}</option>
            ))}
          </select>
          <input name="notes" placeholder="Observação" className={`${inputClass} col-span-2`} />
          <button
            type="submit"
            className="col-span-2 bg-tata-coral text-white rounded-xl py-2.5 font-[family-name:var(--font-baloo)] font-semibold text-sm"
          >
            Adicionar pessoa autorizada
          </button>
        </form>
      </div>

      <div className={cardClass}>
        <span className={cardTitle}>Fotos</span>

        {!child.imageAuthorized ? (
          <p className="text-sm text-tata-coral-dark">
            Autorização de imagem não concedida — fotos não podem ser registradas para esta criança.
          </p>
        ) : (
          <>
            {child.photos.length > 0 && (
              <div className="grid grid-cols-4 gap-2">
                {child.photos.map((photo) => (
                  <div key={photo.id} className="relative aspect-square rounded-xl overflow-hidden bg-tata-surface-hover">
                    <Image src={photo.url} alt={photo.caption ?? ""} fill sizes="150px" className="object-cover" />
                  </div>
                ))}
              </div>
            )}
            <form action={uploadChildPhotoAction} encType="multipart/form-data" className="flex gap-2 items-center pt-2 border-t border-tata-border">
              <input type="hidden" name="childId" value={childId} />
              <input type="hidden" name="revalidateTo" value={`/admin/criancas/${childId}`} />
              <input type="file" name="photo" accept="image/png,image/jpeg,image/webp" required className="text-sm" />
              <input name="caption" placeholder="Legenda" className={inputClass} />
              <button
                type="submit"
                className="bg-tata-green text-white rounded-xl px-4 py-2 font-[family-name:var(--font-baloo)] font-semibold text-sm"
              >
                Enviar
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
