"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { formatDateTime } from "@/lib/date";
import { toUserMessage } from "@/lib/user-error-message";
import { SignaturePad, type SignaturePadHandle } from "@/components/tata/SignaturePad";

type ActionState = { success?: true; error?: string } | null;
type Step = "ler" | "assinar" | "confirmar";

/**
 * Wizard genérico de 3 passos (ler → assinar → confirmar) para qualquer documento que precise de
 * ciência + assinatura manuscrita + aceite — extraído do fluxo original do contrato de prestação
 * de serviços (src/app/pais/contrato/) para ser reaproveitado pelo consentimento LGPD
 * (src/app/pais/consentimento/) sem duplicar a lógica do canvas/estado dos passos. "CLÁUSULA N —"
 * (ou qualquer linha maiúscula seguida de dois-pontos-like) em linha própria vira título em
 * destaque — split de linha, sem parser de markdown, o conteúdo é texto plano por design.
 */
function DocumentBody({ content }: { content: string }) {
  return (
    <div className="max-h-80 overflow-y-auto flex flex-col gap-2.5 text-sm text-tata-ink-soft border border-tata-border rounded-xl p-4 bg-tata-surface-alt">
      {content.split("\n").map((line, i) =>
        line.trim() === "" ? null : /^(CLÁUSULA \d+|\d+\.)/.test(line.trim()) ? (
          <p key={i} className="font-[family-name:var(--font-baloo)] font-semibold text-tata-ink pt-1">
            {line.trim()}
          </p>
        ) : (
          <p key={i}>{line.trim()}</p>
        )
      )}
    </div>
  );
}

export function DocumentAcceptanceWizard({
  acceptanceId,
  documentTitle,
  identificationLines,
  content,
  action,
  checkboxLabel = "Li e compreendi o conteúdo deste documento.",
  confirmIntro,
  confirmChecks,
  submitLabel,
  successTitle,
  successMessage,
}: {
  acceptanceId: string;
  documentTitle: string;
  identificationLines: { label: string; value: string }[];
  content: string;
  action: (formData: FormData) => Promise<void>;
  checkboxLabel?: string;
  confirmIntro: string;
  confirmChecks: [string, string];
  submitLabel: string;
  successTitle: string;
  successMessage: string;
}) {
  const [step, setStep] = useState<Step>("ler");
  const [agreed, setAgreed] = useState(false);
  const [signatureEmpty, setSignatureEmpty] = useState(true);
  const [signatureDataUrl, setSignatureDataUrl] = useState("");
  const signatureRef = useRef<SignaturePadHandle>(null);

  // O canvas é montado desde o início (passo "ler"), ainda escondido — sem isso o bitmap interno
  // fica 0×0 (ver comentário em SignaturePadHandle.resize) e nada do que for desenhado aparece.
  useEffect(() => {
    if (step === "assinar") signatureRef.current?.resize();
  }, [step]);

  const [state, formAction, pending] = useActionState<ActionState, FormData>(async (_prev, formData) => {
    try {
      await action(formData);
      return { success: true };
    } catch (error) {
      return { error: toUserMessage(error, "Não conseguimos concluir o aceite. Verifique sua conexão e tente novamente.") };
    }
  }, null);

  if (state?.success) {
    return (
      <div className="bg-tata-surface rounded-tata-lg shadow-tata-card p-5 flex flex-col gap-1.5 tata-animate-pop">
        <p className="font-[family-name:var(--font-baloo)] font-semibold text-tata-green-dark">{successTitle}</p>
        <p className="text-sm text-tata-ink-soft">{successMessage}</p>
        <p className="text-xs text-tata-ink-muted">{formatDateTime(new Date())}</p>
      </div>
    );
  }

  function goToConfirm() {
    const handle = signatureRef.current;
    if (!handle || handle.isEmpty()) return;
    setSignatureDataUrl(handle.toDataURL());
    setStep("confirmar");
  }

  return (
    <div className="bg-tata-surface rounded-tata-lg shadow-tata-card overflow-hidden flex flex-col">
      <div className="p-5 pb-3 border-b border-tata-border flex flex-col gap-0.5">
        <p className="font-[family-name:var(--font-baloo)] font-semibold text-tata-ink">{documentTitle}</p>
        {identificationLines.map(({ label, value }) => (
          <p key={label} className="text-xs text-tata-ink-muted">
            {label}: <span className="font-semibold text-tata-ink-soft">{value}</span>
          </p>
        ))}
      </div>

      <div className="p-5 flex flex-col gap-4">
        {/* Passo 1 — Ler. Fica montado (só escondido) para não perder o estado do checkbox ao voltar. */}
        <div className={step === "ler" ? "flex flex-col gap-4" : "hidden"}>
          <DocumentBody content={content} />
          <label className="flex items-start gap-2.5 text-sm text-tata-ink-soft">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 w-5 h-5 shrink-0 accent-tata-green"
            />
            {checkboxLabel}
          </label>
          <button
            type="button"
            disabled={!agreed}
            onClick={() => setStep("assinar")}
            className="min-h-11 bg-tata-coral text-white rounded-xl px-6 font-[family-name:var(--font-baloo)] font-semibold text-sm disabled:opacity-50 transition-opacity"
          >
            Continuar
          </button>
        </div>

        {/* Passo 2 — Assinar. Também fica montado (só escondido) para o canvas não perder o traço ao voltar. */}
        <div className={step === "assinar" ? "flex flex-col gap-3 items-center" : "hidden"}>
          <p className="text-sm text-tata-ink-soft self-start">Assine utilizando o dedo, caneta digital ou mouse.</p>
          <SignaturePad ref={signatureRef} onChange={setSignatureEmpty} />
          <div className="flex gap-2.5 w-full max-w-[600px]">
            <button
              type="button"
              onClick={() => signatureRef.current?.clear()}
              className="min-h-11 flex-1 border border-tata-border rounded-xl px-4 text-sm font-semibold text-tata-ink-soft"
            >
              Limpar assinatura
            </button>
            <button
              type="button"
              disabled={signatureEmpty}
              onClick={goToConfirm}
              className="min-h-11 flex-1 bg-tata-coral text-white rounded-xl px-4 font-[family-name:var(--font-baloo)] font-semibold text-sm disabled:opacity-50 transition-opacity"
            >
              Continuar
            </button>
          </div>
          {signatureEmpty && (
            <p className="text-xs text-tata-ink-muted self-start">Por favor, realize sua assinatura antes de continuar.</p>
          )}
        </div>

        {/* Passo 3 — Confirmar. Só existe depois de capturar a assinatura, não precisa ficar montado antes. */}
        {step === "confirmar" && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-tata-ink-soft">{confirmIntro}</p>
            <div className="flex flex-col gap-1 text-sm">
              {identificationLines.map(({ label, value }) => (
                <p key={label} className="text-tata-ink-muted">
                  {label}: <span className="font-semibold text-tata-ink">{value}</span>
                </p>
              ))}
            </div>
            <div className="flex flex-col gap-1.5 text-sm text-tata-ink-soft">
              <p>☑ {confirmChecks[0]}</p>
              <p>☑ {confirmChecks[1]}</p>
            </div>
            {signatureDataUrl && (
              <div className="w-full max-w-[300px] h-[100px] relative bg-white border border-tata-border rounded-xl overflow-hidden">
                <Image src={signatureDataUrl} alt="Prévia da sua assinatura" fill className="object-contain" unoptimized />
              </div>
            )}

            {state?.error && (
              <p role="alert" className="text-sm text-tata-coral-dark font-medium">
                {state.error}
              </p>
            )}

            <form action={formAction} className="flex gap-2.5">
              <input type="hidden" name="acceptanceId" value={acceptanceId} />
              <input type="hidden" name="agreed" value="on" />
              <input type="hidden" name="signature" value={signatureDataUrl} />
              <button
                type="button"
                onClick={() => setStep("assinar")}
                className="min-h-11 flex-1 border border-tata-border rounded-xl px-4 text-sm font-semibold text-tata-ink-soft"
              >
                Voltar
              </button>
              <button
                type="submit"
                disabled={pending}
                className="min-h-11 flex-[2] bg-tata-coral text-white rounded-xl px-4 font-[family-name:var(--font-baloo)] font-semibold text-sm disabled:opacity-50 transition-opacity"
              >
                {pending ? "Registrando..." : submitLabel}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
