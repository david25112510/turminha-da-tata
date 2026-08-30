import Image from "next/image";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AccountForm, EnrollmentWizard } from "./EnrollmentPortal";

export const dynamic = "force-dynamic";
const statusInfo = {
  SUBMITTED: ["🟡 Matrícula em análise", "Estamos analisando sua solicitação."],
  UNDER_REVIEW: ["🟡 Matrícula em análise", "Nossa equipe iniciou a análise."],
  APPROVED: ["🟢 Matrícula aprovada", "Agora conclua os documentos para liberar o Portal dos Pais."],
  REJECTED: ["🔴 Matrícula não aprovada", "Confira abaixo a decisão da equipe."],
  CANCELLED: ["Matrícula cancelada", "Esta solicitação foi cancelada."],
  DRAFT: ["Rascunho", "Continue o preenchimento."],
} as const;

export default async function EnrollmentPage() {
  const session = await auth();
  const guardian = session?.user?.role === "GUARDIAN"
    ? await prisma.guardian.findUnique({
        where: { userId: session.user.id },
        include: { enrollmentRequests: { where: { status: { not: "DRAFT" } }, orderBy: { createdAt: "desc" } } },
      })
    : null;
  return <main className="min-h-screen bg-tata-bg px-4 py-6 sm:py-10"><div className="mx-auto max-w-3xl flex flex-col gap-5">
    <header className="flex items-center justify-between"><Link href="/" className="inline-flex min-h-11 items-center font-[family-name:var(--font-baloo)] text-lg font-bold text-tata-green-dark">Turminha da Tata</Link><Link href="/login" className="min-h-11 inline-flex items-center px-4 font-bold text-tata-ink-soft">ENTRAR</Link></header>
    <div className="flex items-center gap-4 rounded-3xl bg-tata-yellow-soft p-4"><div className="relative size-20 shrink-0"><Image src="/images/tata-mascote.png" alt="Tata, mascote da Turminha da Tata" fill className="object-contain" /></div><div><h1 className="font-[family-name:var(--font-baloo)] text-xl font-bold text-tata-ink">Oi! Eu sou a Tata! 💛</h1><p className="text-sm text-tata-ink-soft">Vamos começar a matrícula?</p></div></div>
    {!guardian ? <AccountForm /> : guardian.enrollmentRequests.length ? <div className="flex flex-col gap-4">{guardian.enrollmentRequests.map(request => { const info = statusInfo[request.status]; return <article key={request.id} className="rounded-3xl bg-white p-6 shadow-tata-card"><h2 className="font-[family-name:var(--font-baloo)] text-xl font-bold">{info[0]}</h2><p className="text-sm text-tata-ink-soft">{info[1]}</p><div className="mt-4 rounded-2xl bg-tata-surface-alt p-4 text-sm"><p><b>Criança:</b> {request.childPreferredName || request.childFullName}</p><p><b>Enviada em:</b> {request.submittedAt?.toLocaleDateString("pt-BR")}</p><p><b>Última atualização:</b> {request.updatedAt.toLocaleDateString("pt-BR")}</p>{request.status === "REJECTED" && request.rejectionReason && <p className="mt-2 text-tata-coral-dark"><b>Motivo:</b> {request.rejectionReason}</p>}</div>{request.status === "APPROVED" && <Link href="/pais/contrato" className="mt-4 inline-flex min-h-12 items-center rounded-2xl bg-tata-green px-5 font-bold text-white">CONTINUAR PARA O CONTRATO</Link>}</article>})}</div> : <EnrollmentWizard guardianName={guardian.name} guardianCpf={guardian.cpf} guardianPhone={guardian.phone} guardianEmail={guardian.email || session?.user?.email || ""} />}
  </div></main>;
}
