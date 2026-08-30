import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { WEEKDAYS, WEEKDAY_LABELS, CHILD_STATUS_LABELS, IMAGE_AUTH_CATEGORIES } from "@/lib/labels";
import { updateChildAction, uploadChildProfilePhotoAction } from "../../actions";
import { resolveStoredFileUrl } from "@/lib/storage";

const inputClass =
  "min-h-11 border border-tata-border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-tata-green transition-colors bg-tata-surface";
const labelClass = "text-sm font-semibold text-tata-ink-strong";

export default async function EditChildPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const child = await prisma.child.findUnique({ where: { id } });
  if (!child) notFound();
  const photoUrl = await resolveStoredFileUrl(child.photoUrl);

  return (
    <div className="p-4 sm:p-8 flex flex-col gap-6 max-w-2xl">
      <Link href={`/admin/criancas/${id}`} className="text-sm font-semibold text-tata-ink-soft min-h-11 flex items-center gap-1 -ml-1">
        ← Voltar
      </Link>

      <h1 className="font-[family-name:var(--font-baloo)] font-semibold text-xl text-tata-ink">
        Editar {child.preferredName || child.fullName}
      </h1>
      <p className="text-sm text-tata-ink-muted-alt -mt-4">
        Nome completo, CPF, certidão, sexo e data de nascimento não são editáveis por aqui — fale com o suporte
        técnico se precisar corrigir algum desses dados.
      </p>

      <div className="bg-tata-surface rounded-tata-lg shadow-tata-card p-6 flex flex-col gap-4">
        <span className={labelClass}>Foto de perfil</span>
        <div className="flex items-center gap-4">
          {photoUrl && (
            <div className="relative w-16 h-16 rounded-full overflow-hidden bg-tata-surface-hover shrink-0">
              <Image src={photoUrl} alt="" fill unoptimized className="object-cover" />
            </div>
          )}
          <form action={uploadChildProfilePhotoAction} encType="multipart/form-data" className="flex gap-2 items-center">
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

      <form action={updateChildAction} className="bg-tata-surface rounded-tata-lg shadow-tata-card p-6 flex flex-col gap-5">
        <input type="hidden" name="id" value={id} />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>Nome preferido</span>
            <input name="preferredName" defaultValue={child.preferredName ?? ""} className={inputClass} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>Status</span>
            <select name="status" defaultValue={child.status} className={inputClass}>
              {Object.entries(CHILD_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="h-px bg-tata-border" />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>Horário de entrada</span>
            <input type="time" name="contractedEntryTime" defaultValue={child.contractedEntryTime} className={inputClass} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>Horário de saída</span>
            <input type="time" name="contractedExitTime" defaultValue={child.contractedExitTime} className={inputClass} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>Tolerância (minutos)</span>
            <input type="number" name="toleranceMinutes" defaultValue={child.toleranceMinutes} min={0} className={inputClass} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>Dia de vencimento</span>
            <input type="number" name="dueDay" defaultValue={child.dueDay} min={1} max={31} className={inputClass} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>Valor mensal (R$)</span>
            <input name="monthlyFee" defaultValue={child.monthlyFee.toString()} required className={inputClass} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>Valor da hora excedente (R$)</span>
            <input name="overtimeHourRate" defaultValue={child.overtimeHourRate.toString()} required className={inputClass} />
          </label>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className={labelClass}>Dias contratados</span>
          <div className="flex gap-2 flex-wrap">
            {WEEKDAYS.map((day) => (
              <label
                key={day}
                className="flex items-center gap-1.5 border border-tata-border rounded-lg px-3 py-1.5 text-xs font-semibold text-tata-ink-soft cursor-pointer"
              >
                <input type="checkbox" name={`day_${day}`} defaultChecked={child.contractedDays.includes(day)} />
                {WEEKDAY_LABELS[day]}
              </label>
            ))}
          </div>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Observações gerais</span>
          <textarea name="generalNotes" defaultValue={child.generalNotes ?? ""} rows={3} className={inputClass} />
        </label>

        <div className="flex flex-col gap-1.5">
          <span className={labelClass}>Autorização de imagem</span>
          <div className="flex flex-col gap-2">
            {IMAGE_AUTH_CATEGORIES.map(({ field, label }) => (
              <label key={field} className="flex items-center gap-2 text-sm text-tata-ink-strong">
                <input type="checkbox" name={field} defaultChecked={child[field]} />
                {label}
              </label>
            ))}
          </div>
        </div>

        <button
          type="submit"
          className="bg-tata-coral text-white rounded-xl py-3 font-[family-name:var(--font-baloo)] font-semibold text-sm self-start px-8 min-h-11"
        >
          Salvar alterações
        </button>
      </form>
    </div>
  );
}
