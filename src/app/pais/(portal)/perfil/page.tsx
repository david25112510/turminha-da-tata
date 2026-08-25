import Link from "next/link";
import { auth } from "@/auth";
import { requireGuardian } from "@/lib/guardian";
import { RELATIONSHIP_LABELS } from "@/lib/labels";
import { ChangePasswordForm } from "@/components/tata/ChangePasswordForm";
import { PushNotificationToggle } from "../PushNotificationToggle";

const PERMISSION_LABELS: { key: "viewRoutine" | "viewPhotos" | "viewFinancial" | "authorizeMedication" | "authorizePickup" | "receiveNotifications"; label: string }[] = [
  { key: "viewRoutine", label: "Ver rotina" },
  { key: "viewPhotos", label: "Ver fotos" },
  { key: "viewFinancial", label: "Ver financeiro" },
  { key: "authorizeMedication", label: "Autorizar medicamentos" },
  { key: "authorizePickup", label: "Autorizar retirada" },
  { key: "receiveNotifications", label: "Receber notificações" },
];

const SECTION_LINKS = [
  { href: "/pais/atividades", icon: "🎨", label: "Atividades" },
  { href: "/pais/comunicados", icon: "📣", label: "Comunicados" },
  { href: "/pais/agenda", icon: "📅", label: "Agenda" },
];

export default async function GuardianProfilePage() {
  const session = await auth();
  const guardian = await requireGuardian();

  return (
    <div className="p-4 sm:p-6 flex flex-col gap-5 max-w-2xl mx-auto">
      <h1 className="font-[family-name:var(--font-baloo)] font-semibold text-xl text-tata-ink">👤 Perfil</h1>

      <div className="bg-tata-surface rounded-tata-lg shadow-tata-card p-5 flex flex-col gap-2">
        <span className="font-[family-name:var(--font-baloo)] font-semibold text-sm text-tata-ink">Meus dados</span>
        <div className="text-sm text-tata-ink-soft flex flex-col gap-1">
          <p><span className="text-tata-ink-muted">Nome:</span> {guardian.name}</p>
          <p><span className="text-tata-ink-muted">E-mail:</span> {session?.user.email}</p>
          <p><span className="text-tata-ink-muted">Telefone:</span> {guardian.phone}</p>
        </div>
        <p className="text-xs text-tata-ink-muted mt-1">
          Para alterar esses dados, fale com a administração da Turminha da Tata.
        </p>
      </div>

      <div className="bg-tata-surface rounded-tata-lg shadow-tata-card p-5 flex flex-col gap-3">
        <span className="font-[family-name:var(--font-baloo)] font-semibold text-sm text-tata-ink">
          🔔 Notificações push
        </span>
        <PushNotificationToggle />
      </div>

      <div className="bg-tata-surface rounded-tata-lg shadow-tata-card p-5 flex flex-col gap-3">
        <span className="font-[family-name:var(--font-baloo)] font-semibold text-sm text-tata-ink">
          🔒 Alterar senha
        </span>
        <ChangePasswordForm />
      </div>

      <div className="flex flex-col gap-3">
        <span className="font-[family-name:var(--font-baloo)] font-semibold text-sm text-tata-ink">
          Crianças vinculadas
        </span>
        {guardian.children.map((link) => (
          <div key={link.childId} className="bg-tata-surface rounded-tata-lg shadow-tata-card p-4 flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-tata-ink text-sm">
                {link.child.preferredName || link.child.fullName}
              </span>
              <span className="text-xs text-tata-ink-muted">
                {RELATIONSHIP_LABELS[link.relationship] ?? link.relationship}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {PERMISSION_LABELS.map(({ key, label }) => (
                <span
                  key={key}
                  className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                    link[key] ? "bg-tata-green/10 text-tata-green-dark" : "bg-tata-ink-muted/10 text-tata-ink-muted"
                  }`}
                >
                  {link[key] ? "✓" : "✕"} {label}
                </span>
              ))}
            </div>
            <p className="text-xs text-tata-ink-muted">
              Permissões concedidas pela escola. Para alterar, fale com a administração.
            </p>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        <span className="font-[family-name:var(--font-baloo)] font-semibold text-sm text-tata-ink">
          Mais seções
        </span>
        <div className="grid grid-cols-3 gap-2.5">
          {SECTION_LINKS.map((s) => (
            <Link
              key={s.href}
              href={s.href}
              className="min-h-16 flex flex-col items-center justify-center gap-1 bg-tata-surface rounded-tata-lg shadow-tata-card py-3"
            >
              <span className="text-xl" aria-hidden="true">{s.icon}</span>
              <span className="text-xs font-semibold text-tata-ink">{s.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
