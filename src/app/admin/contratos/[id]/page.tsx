import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/date";
import { resendPendingContractNotificationAction } from "../actions";
import { resolveStoredFileUrl } from "@/lib/storage";

const STATUS_LABELS: Record<string, string> = { PENDING: "🟡 Pendente", ACCEPTED: "🟢 Aceito", CANCELLED: "🔴 Cancelado" };
const STATUS_TONE: Record<string, string> = {
  PENDING: "bg-tata-yellow/10 text-tata-yellow-dark",
  ACCEPTED: "bg-tata-green/10 text-tata-green-dark",
  CANCELLED: "bg-tata-coral/10 text-tata-coral-dark",
};

export default async function AdminContractDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const acceptance = await prisma.contractAcceptance.findUnique({
    where: { id },
    include: { child: true, guardian: true, version: true },
  });
  if (!acceptance) notFound();

  const childName = acceptance.child.preferredName || acceptance.child.fullName;
  const signatureUrl = await resolveStoredFileUrl(acceptance.signatureUrl);

  return (
    <div className="p-4 sm:p-8 flex flex-col gap-6 max-w-3xl">
      <Link href="/admin/contratos" className="text-sm font-semibold text-tata-ink-soft min-h-11 flex items-center gap-1 -ml-1">
        ← Voltar para contratos
      </Link>

      <div className="flex items-center justify-between gap-3">
        <h1 className="font-[family-name:var(--font-baloo)] font-semibold text-xl text-tata-ink">
          Contrato — {childName}
        </h1>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${STATUS_TONE[acceptance.status]}`}>
          {STATUS_LABELS[acceptance.status]}
        </span>
      </div>

      <div className="bg-tata-surface rounded-tata-lg shadow-tata-card p-5 flex flex-col gap-2 text-sm">
        <p className="text-tata-ink-muted">
          Criança: <Link href={`/admin/criancas/${acceptance.childId}`} className="font-semibold text-tata-green hover:underline">{childName}</Link>
        </p>
        <p className="text-tata-ink-muted">Responsável: <span className="font-semibold text-tata-ink-soft">{acceptance.guardian.name}</span></p>
        <p className="text-tata-ink-muted">Versão: <span className="font-semibold text-tata-ink-soft">{acceptance.version.version}</span></p>
        {acceptance.acceptedAt && (
          <p className="text-tata-ink-muted">Aceito em: <span className="font-semibold text-tata-ink-soft">{formatDateTime(acceptance.acceptedAt)}</span></p>
        )}
        <p className="text-tata-ink-muted">Assinado: <span className="font-semibold text-tata-ink-soft">{acceptance.signatureUrl ? "✓ Sim" : "Não"}</span></p>

        {acceptance.status === "PENDING" && (
          <form action={resendPendingContractNotificationAction} className="pt-1">
            <input type="hidden" name="acceptanceId" value={acceptance.id} />
            <button type="submit" className="min-h-11 bg-tata-yellow-dark text-white rounded-xl px-4 text-sm font-semibold font-[family-name:var(--font-baloo)]">
              Reenviar notificação
            </button>
          </form>
        )}
      </div>

      <div className="bg-tata-surface rounded-tata-lg shadow-tata-card p-5 flex flex-col gap-2.5 text-sm text-tata-ink-soft">
        <span className="font-[family-name:var(--font-baloo)] font-semibold text-tata-ink">Conteúdo do contrato</span>
        {acceptance.version.content.split("\n").map((line, i) =>
          line.trim() === "" ? null : /^CLÁUSULA \d+/.test(line.trim()) ? (
            <p key={i} className="font-[family-name:var(--font-baloo)] font-semibold text-tata-ink pt-1">
              {line.trim()}
            </p>
          ) : (
            <p key={i}>{line.trim()}</p>
          )
        )}
      </div>

      {signatureUrl && (
        <div className="bg-tata-surface rounded-tata-lg shadow-tata-card p-5 flex flex-col gap-1.5">
          <span className="font-[family-name:var(--font-baloo)] font-semibold text-tata-ink text-sm">Assinatura do responsável</span>
          <div className="w-full max-w-[300px] h-[100px] relative bg-white border border-tata-border rounded-xl overflow-hidden">
            <Image src={signatureUrl} alt={`Assinatura de ${acceptance.guardian.name}`} fill unoptimized className="object-contain" />
          </div>
        </div>
      )}
    </div>
  );
}
