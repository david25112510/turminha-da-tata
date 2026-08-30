import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireGuardian } from "@/lib/guardian";
import { formatDateTime } from "@/lib/date";
import { resolveStoredFileUrl } from "@/lib/storage";

export const dynamic = "force-dynamic";

export default async function GuardianPrivacyPolicyDetailPage({ params }: { params: Promise<{ acceptanceId: string }> }) {
  const { acceptanceId } = await params;
  const guardian = await requireGuardian();

  // Nunca confia só no id da URL: só abre se a acceptance realmente pertencer a este guardian.
  const acceptance = await prisma.privacyPolicyAcceptance.findFirst({
    where: { id: acceptanceId, guardianId: guardian.id, status: "ACCEPTED" },
    include: { version: true },
  });
  if (!acceptance) notFound();
  const signatureUrl = await resolveStoredFileUrl(acceptance.signatureUrl);

  return (
    <div className="p-4 sm:p-6 flex flex-col gap-5 max-w-2xl mx-auto">
      <Link href="/pais/documentos" className="text-sm font-semibold text-tata-ink-soft min-h-11 flex items-center gap-1 -ml-1">
        ← Voltar
      </Link>

      <div className="bg-tata-surface rounded-tata-lg shadow-tata-card overflow-hidden flex flex-col">
        <div className="p-5 pb-3 border-b border-tata-border flex flex-col gap-1">
          <p className="font-[family-name:var(--font-baloo)] font-semibold text-lg text-tata-ink">
            Política de Privacidade
          </p>
          <p className="text-xs text-tata-ink-muted">Versão {acceptance.version.version}</p>
          <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-tata-ink-muted pt-1">
            <span>Responsável: <span className="font-semibold text-tata-ink-soft">{guardian.name}</span></span>
          </div>
          <span className="self-start mt-2 text-xs font-semibold px-2.5 py-1 rounded-full bg-tata-green/10 text-tata-green-dark">
            🟢 Aceito {acceptance.acceptedAt && `em ${formatDateTime(acceptance.acceptedAt)}`}
          </span>
        </div>

        <div className="p-5 flex flex-col gap-2.5 text-sm text-tata-ink-soft">
          {acceptance.version.content.split("\n").map((line, i) =>
            line.trim() === "" ? null : /^\d+\./.test(line.trim()) ? (
              <p key={i} className="font-[family-name:var(--font-baloo)] font-semibold text-tata-ink pt-1">
                {line.trim()}
              </p>
            ) : (
              <p key={i}>{line.trim()}</p>
            )
          )}
        </div>

        {signatureUrl && (
          <div className="p-5 pt-0 flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-tata-ink-muted uppercase tracking-wide">Assinatura do responsável</span>
            <div className="w-full max-w-[300px] h-[100px] relative bg-white border border-tata-border rounded-xl overflow-hidden">
              <Image src={signatureUrl} alt={`Assinatura de ${guardian.name}`} fill unoptimized className="object-contain" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
