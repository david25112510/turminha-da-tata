import Image from "next/image";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { DeleteConfirmDialog } from "@/components/tata/DeleteConfirmDialog";
import { updateCaregiverAction, toggleCaregiverActiveAction, uploadCaregiverPhotoAction, deleteCaregiverAction } from "../actions";

const inputClass =
  "min-h-11 border border-tata-border rounded-xl px-3 py-2 text-sm outline-none focus:border-tata-green transition-colors bg-tata-surface";
const labelClass = "text-sm font-semibold text-tata-ink-strong";
const cardClass = "bg-tata-surface rounded-2xl shadow-sm p-5 flex flex-col gap-4";
const cardTitle = "font-[family-name:var(--font-baloo)] font-semibold text-base text-tata-ink";

function toDateInputValue(date: Date | null) {
  if (!date) return "";
  return date.toISOString().slice(0, 10);
}

export default async function CaregiverDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const caregiver = await prisma.user.findFirst({ where: { id, role: "CAREGIVER" } });
  if (!caregiver) notFound();

  return (
    <div className="p-4 sm:p-8 flex flex-col gap-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-[family-name:var(--font-baloo)] font-semibold text-xl text-tata-ink">
            {caregiver.name}
          </h1>
          <p className="text-sm text-tata-ink-muted-alt">{caregiver.email}</p>
        </div>
        <span
          className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
            caregiver.active ? "bg-tata-green/10 text-tata-green-dark" : "bg-tata-ink-muted/10 text-tata-ink-muted"
          }`}
        >
          {caregiver.active ? "Ativa" : "Inativa"}
        </span>
      </div>

      <div className={cardClass}>
        <span className={cardTitle}>Foto</span>
        <div className="flex items-center gap-4">
          <div className="relative w-16 h-16 rounded-full overflow-hidden bg-tata-surface-hover shrink-0">
            {caregiver.photoUrl && (
              <Image src={caregiver.photoUrl} alt="" fill sizes="64px" className="object-cover" />
            )}
          </div>
          <form action={uploadCaregiverPhotoAction} encType="multipart/form-data" className="flex gap-2 items-center">
            <input type="hidden" name="id" value={id} />
            <input type="file" name="photo" accept="image/png,image/jpeg,image/webp" required className="text-sm" />
            <button
              type="submit"
              className="min-h-11 bg-tata-green text-white rounded-xl px-4 font-[family-name:var(--font-baloo)] font-semibold text-sm"
            >
              Enviar
            </button>
          </form>
        </div>
      </div>

      <div className={cardClass}>
        <span className={cardTitle}>Dados pessoais</span>
        <form action={updateCaregiverAction} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <input type="hidden" name="id" value={id} />
          <label className="flex flex-col gap-1.5 sm:col-span-2">
            <span className={labelClass}>Nome completo</span>
            <input name="name" defaultValue={caregiver.name} required className={inputClass} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>Telefone</span>
            <input name="phone" defaultValue={caregiver.phone ?? ""} className={inputClass} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>CPF</span>
            <input name="cpf" defaultValue={caregiver.cpf ?? ""} className={inputClass} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>Data de nascimento</span>
            <input type="date" name="birthDate" defaultValue={toDateInputValue(caregiver.birthDate)} className={inputClass} />
          </label>
          <label className="flex flex-col gap-1.5 sm:col-span-2">
            <span className={labelClass}>Observações</span>
            <textarea name="notes" rows={3} defaultValue={caregiver.notes ?? ""} className={inputClass} />
          </label>
          <button
            type="submit"
            className="sm:col-span-2 min-h-11 bg-tata-coral text-white rounded-xl py-2.5 font-[family-name:var(--font-baloo)] font-semibold text-sm self-start px-8"
          >
            Salvar alterações
          </button>
        </form>
      </div>

      <div className={cardClass}>
        <span className={cardTitle}>Acesso</span>
        <p className="text-sm text-tata-ink-soft">
          {caregiver.active
            ? "Esta cuidadora pode fazer login e registrar a rotina das crianças."
            : "Esta cuidadora está desativada e não consegue fazer login. O histórico de registros dela é mantido."}
        </p>
        <form action={toggleCaregiverActiveAction}>
          <input type="hidden" name="id" value={id} />
          <button
            type="submit"
            className={`min-h-11 rounded-xl px-6 font-[family-name:var(--font-baloo)] font-semibold text-sm ${
              caregiver.active ? "bg-tata-coral-dark/10 text-tata-coral-dark" : "bg-tata-green/10 text-tata-green-dark"
            }`}
          >
            {caregiver.active ? "Desativar cuidadora" : "Reativar cuidadora"}
          </button>
        </form>
      </div>

      <div className={cardClass}>
        <span className={cardTitle}>Zona de risco</span>
        <p className="text-sm text-tata-ink-soft">
          Diferente de desativar, excluir apaga a conta permanentemente. Os registros que ela já fez
          (rotina, medicamentos administrados, fotos) são mantidos, só perdem a autoria.
        </p>
        <DeleteConfirmDialog
          action={deleteCaregiverAction}
          hiddenFields={{ id }}
          entityLabel="cuidadora"
          entityName={caregiver.name}
          triggerLabel="Excluir cuidadora"
          triggerClassName="self-start min-h-11 bg-tata-coral-dark/10 text-tata-coral-dark rounded-xl px-6 font-[family-name:var(--font-baloo)] font-semibold text-sm"
        />
      </div>
    </div>
  );
}
