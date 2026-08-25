import { prisma } from "@/lib/prisma";
import { createGuardianAction } from "../actions";
import { RELATIONSHIP_LABELS } from "@/lib/labels";

const inputClass =
  "min-h-11 border border-tata-border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-tata-green transition-colors bg-tata-surface";
const labelClass = "text-sm font-semibold text-tata-ink-strong";
const checkClass = "flex items-center gap-2 text-sm text-tata-ink-strong";

export default async function NewGuardianPage() {
  const children = await prisma.child.findMany({
    where: { status: "ACTIVE" },
    orderBy: { fullName: "asc" },
  });

  return (
    <div className="p-4 sm:p-8 flex flex-col gap-6 max-w-2xl">
      <h1 className="font-[family-name:var(--font-baloo)] font-semibold text-xl text-tata-ink">
        Novo responsável
      </h1>

      <form action={createGuardianAction} className="bg-tata-surface rounded-2xl shadow-sm p-6 flex flex-col gap-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="flex flex-col gap-1.5 sm:col-span-2">
            <span className={labelClass}>Nome completo</span>
            <input name="name" required className={inputClass} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>CPF</span>
            <input name="cpf" required className={inputClass} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>Telefone</span>
            <input name="phone" required className={inputClass} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>WhatsApp</span>
            <input name="whatsapp" className={inputClass} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>E-mail</span>
            <input type="email" name="email" className={inputClass} />
          </label>
          <label className="flex flex-col gap-1.5 sm:col-span-2">
            <span className={labelClass}>Endereço</span>
            <input name="address" className={inputClass} />
          </label>
        </div>

        <div className="h-px bg-tata-border" />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>Criança vinculada</span>
            <select name="childId" required className={inputClass} defaultValue="">
              <option value="" disabled>
                Selecione
              </option>
              {children.map((child) => (
                <option key={child.id} value={child.id}>
                  {child.preferredName || child.fullName}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>Parentesco</span>
            <select name="relationship" className={inputClass} defaultValue="MOTHER">
              {Object.entries(RELATIONSHIP_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="flex gap-6">
          <label className={checkClass}>
            <input type="checkbox" name="isPrimary" defaultChecked />
            Responsável principal
          </label>
          <label className={checkClass}>
            <input type="checkbox" name="isFinancialResponsible" defaultChecked />
            Responsável financeiro
          </label>
        </div>

        <div className="h-px bg-tata-border" />

        <div className="flex flex-col gap-2.5">
          <span className={labelClass}>Permissões</span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <label className={checkClass}>
              <input type="checkbox" name="receiveNotifications" defaultChecked />
              Receber notificações
            </label>
            <label className={checkClass}>
              <input type="checkbox" name="viewRoutine" defaultChecked />
              Visualizar rotina
            </label>
            <label className={checkClass}>
              <input type="checkbox" name="viewPhotos" defaultChecked />
              Visualizar fotos
            </label>
            <label className={checkClass}>
              <input type="checkbox" name="receiveCommunications" defaultChecked />
              Receber comunicados
            </label>
            <label className={checkClass}>
              <input type="checkbox" name="authorizeMedication" />
              Autorizar medicamentos
            </label>
            <label className={checkClass}>
              <input type="checkbox" name="authorizePickup" />
              Autorizar retirada
            </label>
            <label className={checkClass}>
              <input type="checkbox" name="viewFinancial" />
              Visualizar financeiro
            </label>
          </div>
        </div>

        <div className="h-px bg-tata-border" />

        <label className={checkClass}>
          <input type="checkbox" name="createPortalAccess" id="createPortalAccess" />
          Criar acesso ao portal dos pais (usa o e-mail acima)
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Senha temporária</span>
          <input name="tempPassword" placeholder="Necessário se marcar o acesso ao portal" className={inputClass} />
        </label>

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
