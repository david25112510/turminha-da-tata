"use client";

import { useActionState, useRef, useState } from "react";
import Image from "next/image";
import { generatePixChargeAction, type PixChargeState } from "./actions";

/**
 * Botão + <dialog> nativo para gerar/mostrar a cobrança Pix de uma fatura em aberto — mesmo padrão
 * de dialog nativo usado em ActionDialogButton (src/app/cuidadora/.../ActionDialogButton.tsx), mas
 * autocontido (sem DialogCloseProvider, escopo é local a este único botão).
 */
export function PixPaymentButton({ invoiceId, childId }: { invoiceId: string; childId: string }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [state, formAction, pending] = useActionState<PixChargeState, FormData>(generatePixChargeAction, undefined);
  const [copied, setCopied] = useState(false);

  const success = state && "qrCode" in state ? state : null;

  async function copyCode() {
    if (!success) return;
    try {
      await navigator.clipboard.writeText(success.qrCodeText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard pode falhar por permissão do navegador — o código copia-e-cola já está visível na tela.
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        className="min-h-11 w-full bg-tata-green text-white rounded-xl px-4 py-2.5 font-[family-name:var(--font-baloo)] font-semibold text-sm transition-opacity hover:opacity-90"
      >
        💚 Pagar com Pix
      </button>

      <dialog
        ref={dialogRef}
        aria-label="Pagamento via Pix"
        className="rounded-tata-lg p-0 backdrop:bg-black/40 w-[calc(100%-2rem)] max-w-sm m-auto"
        onClick={(e) => {
          if (e.target === e.currentTarget) dialogRef.current?.close();
        }}
      >
        <div className="p-5 flex flex-col gap-3 max-h-[80vh] overflow-y-auto tata-animate-pop">
          <div className="flex items-center justify-between">
            <h2 className="font-[family-name:var(--font-baloo)] font-semibold text-base text-tata-ink">Pagar com Pix</h2>
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              aria-label="Fechar"
              className="min-h-11 min-w-11 flex items-center justify-center text-tata-ink-muted text-lg"
            >
              ✕
            </button>
          </div>

          {success ? (
            <div className="flex flex-col items-center gap-3">
              <div className="w-48 h-48 relative bg-white border border-tata-border rounded-tata-lg overflow-hidden">
                <Image
                  src={`data:image/png;base64,${success.qrCode}`}
                  alt="QR Code para pagamento via Pix"
                  fill
                  className="object-contain"
                  unoptimized
                />
              </div>
              <p className="text-xs text-tata-ink-muted text-center">
                Escaneie com o app do seu banco, ou copie o código abaixo.
              </p>
              <div className="w-full bg-tata-surface-alt rounded-xl p-3">
                <code className="text-xs font-mono text-tata-ink break-all">{success.qrCodeText}</code>
              </div>
              <button
                type="button"
                onClick={copyCode}
                className="min-h-11 w-full border border-tata-border text-tata-ink-soft rounded-xl px-4 py-2.5 font-[family-name:var(--font-baloo)] font-semibold text-sm"
              >
                {copied ? "✓ Copiado!" : "Copiar código"}
              </button>
              <p className="text-xs text-tata-ink-muted text-center">
                Válido até {new Intl.DateTimeFormat("pt-BR", { timeStyle: "short" }).format(new Date(success.expiresAt))}. Assim
                que o pagamento for confirmado, esta cobrança é atualizada automaticamente.
              </p>
            </div>
          ) : (
            <form action={formAction} className="flex flex-col gap-3">
              <input type="hidden" name="invoiceId" value={invoiceId} />
              <input type="hidden" name="childId" value={childId} />
              <p className="text-sm text-tata-ink-soft">Gere um QR Code Pix para pagar esta mensalidade agora.</p>
              {state && "error" in state && (
                <p role="alert" className="text-sm text-tata-coral-dark font-medium">
                  {state.error}
                </p>
              )}
              <button
                type="submit"
                disabled={pending}
                className="min-h-11 bg-tata-green text-white rounded-xl px-4 py-2.5 font-[family-name:var(--font-baloo)] font-semibold text-sm disabled:opacity-60 transition-opacity"
              >
                {pending ? "Gerando..." : "Gerar QR Code Pix"}
              </button>
            </form>
          )}
        </div>
      </dialog>
    </>
  );
}
