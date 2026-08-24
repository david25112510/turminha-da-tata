import { auth, signOut } from "@/auth";
import { requireCaregiver } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { ChangePasswordForm } from "@/components/tata/ChangePasswordForm";

export default async function CaregiverProfilePage() {
  await requireCaregiver();
  const session = await auth();

  const me = session?.user?.id
    ? await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { name: true, email: true, phone: true },
      })
    : null;

  return (
    <div className="p-4 sm:p-6 flex flex-col gap-5 max-w-2xl mx-auto">
      <h1 className="font-[family-name:var(--font-baloo)] font-semibold text-xl text-tata-ink">👤 Meu perfil</h1>

      <div className="bg-tata-surface rounded-2xl shadow-sm p-5 flex flex-col gap-2">
        <span className="font-[family-name:var(--font-baloo)] font-semibold text-sm text-tata-ink">Meus dados</span>
        <div className="text-sm text-tata-ink-soft flex flex-col gap-1">
          <p><span className="text-tata-ink-muted">Nome:</span> {me?.name}</p>
          <p><span className="text-tata-ink-muted">E-mail:</span> {me?.email}</p>
          {me?.phone && <p><span className="text-tata-ink-muted">Telefone:</span> {me.phone}</p>}
        </div>
        <p className="text-xs text-tata-ink-muted mt-1">
          Para alterar esses dados, fale com a administração da Turminha da Tata.
        </p>
      </div>

      <div className="bg-tata-surface rounded-2xl shadow-sm p-5 flex flex-col gap-3">
        <span className="font-[family-name:var(--font-baloo)] font-semibold text-sm text-tata-ink">
          🔒 Alterar senha
        </span>
        <ChangePasswordForm />
      </div>

      <form
        action={async () => {
          "use server";
          await signOut({ redirectTo: "/login" });
        }}
      >
        <button
          type="submit"
          className="min-h-11 w-full bg-tata-surface shadow-sm rounded-2xl text-sm font-semibold text-tata-coral-dark"
        >
          Sair
        </button>
      </form>
    </div>
  );
}
