import { createChildAction } from "../actions";
import { WEEKDAYS, WEEKDAY_LABELS, IMAGE_AUTH_CATEGORIES } from "@/lib/labels";

const inputClass =
  "min-h-11 border border-tata-border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-tata-green transition-colors bg-tata-surface";
const labelClass = "text-sm font-semibold text-tata-ink-strong";

export default function NewChildPage() {
  return (
    <div className="p-4 sm:p-8 flex flex-col gap-6 max-w-2xl">
      <h1 className="font-[family-name:var(--font-baloo)] font-semibold text-xl text-tata-ink">
        Nova criança
      </h1>

      <form action={createChildAction} className="bg-tata-surface rounded-2xl shadow-sm p-6 flex flex-col gap-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="flex flex-col gap-1.5 sm:col-span-2">
            <span className={labelClass}>Nome completo</span>
            <input name="fullName" required className={inputClass} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>Nome preferido</span>
            <input name="preferredName" className={inputClass} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>Sexo</span>
            <select name="sex" className={inputClass} defaultValue="FEMALE">
              <option value="FEMALE">Feminino</option>
              <option value="MALE">Masculino</option>
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>Data de nascimento</span>
            <input type="date" name="birthDate" required className={inputClass} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>CPF</span>
            <input name="cpf" className={inputClass} />
          </label>
          <label className="flex flex-col gap-1.5 sm:col-span-2">
            <span className={labelClass}>Certidão de nascimento</span>
            <input name="birthCertificate" className={inputClass} />
          </label>
        </div>

        <div className="h-px bg-tata-border" />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>Horário de entrada</span>
            <input type="time" name="contractedEntryTime" defaultValue="07:30" className={inputClass} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>Horário de saída</span>
            <input type="time" name="contractedExitTime" defaultValue="17:30" className={inputClass} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>Tolerância (minutos)</span>
            <input type="number" name="toleranceMinutes" defaultValue={15} min={0} className={inputClass} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>Dia de vencimento</span>
            <input type="number" name="dueDay" defaultValue={5} min={1} max={31} className={inputClass} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>Valor mensal (R$)</span>
            <input name="monthlyFee" placeholder="900,00" required className={inputClass} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>Valor da hora excedente (R$)</span>
            <input name="overtimeHourRate" placeholder="15,00" required className={inputClass} />
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
                <input type="checkbox" name={`day_${day}`} defaultChecked={day !== "SAT" && day !== "SUN"} />
                {WEEKDAY_LABELS[day]}
              </label>
            ))}
          </div>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Observações gerais</span>
          <textarea name="generalNotes" rows={3} className={inputClass} />
        </label>

        <div className="flex flex-col gap-1.5">
          <span className={labelClass}>Autorização de imagem</span>
          <div className="flex flex-col gap-2">
            {IMAGE_AUTH_CATEGORIES.map(({ field, label }) => (
              <label key={field} className="flex items-center gap-2 text-sm text-tata-ink-strong">
                <input type="checkbox" name={field} />
                {label}
              </label>
            ))}
          </div>
        </div>

        <button
          type="submit"
          className="bg-tata-coral text-white rounded-xl py-3 font-[family-name:var(--font-baloo)] font-semibold text-sm self-start px-8"
        >
          Salvar
        </button>
      </form>
    </div>
  );
}
