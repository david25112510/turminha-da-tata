"use client";

import { useActionState, useState } from "react";
import { formatDateTime } from "@/lib/date";
import { toUserMessage } from "@/lib/user-error-message";

type ActionState = { success?: true; error?: string } | null;

/**
 * "CLÁUSULA N — ..." em linha própria vira um título em destaque; o resto do texto renderiza como
 * parágrafo simples. Split de linha, sem parser de markdown — o conteúdo é texto plano por design
 * (ver src/lib/contract-template.ts).
 */
function ContractBody({ content }: { content: string }) {
  return (
    <div className="max-h-80 overflow-y-auto flex flex-col gap-2.5 text-sm text-tata-ink-soft border border-tata-border rounded-xl p-4 bg-tata-surface-alt">
      {content.split("\n").map((line, i) =>
        line.trim() === "" ? null : /^CLÁUSULA \d+/.test(line.trim()) ? (
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

export function ContractAcceptanceCard({
  acceptanceId,
  childName,
  guardianName,
  version,
  content,
  action,
}: {
  acceptanceId: string;
  childName: string;
  guardianName: string;
  version: string;
  content: string;
  action: (formData: FormData) => Promise<void>;
}) {
  const [agreed, setAgreed] = useState(false);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(async (_prev, formData) => {
    try {
      await action(formData);
      return { success: true };
    } catch (error) {
      return { error: toUserMessage(error, "Não foi possível registrar o aceite. Tente novamente.") };
    }
  }, null);

  if (state?.success) {
    return (
      <div className="bg-tata-surface rounded-tata-lg shadow-tata-card p-5 flex flex-col gap-1.5 tata-animate-pop">
        <p className="font-[family-name:var(--font-baloo)] font-semibold text-tata-green-dark">
          Contrato aceito com sucesso! 💛
        </p>
        <p className="text-xs text-tata-ink-muted">{childName} — {formatDateTime(new Date())}</p>
      </div>
    );
  }

  return (
    <div className="bg-tata-surface rounded-tata-lg shadow-tata-card overflow-hidden flex flex-col">
      <div className="p-5 pb-3 border-b border-tata-border flex flex-col gap-0.5">
        <p className="font-[family-name:var(--font-baloo)] font-semibold text-tata-ink">
          Contrato de prestação de serviços
        </p>
        <p className="text-xs text-tata-ink-muted">Criança: <span className="font-semibold text-tata-ink-soft">{childName}</span></p>
        <p className="text-xs text-tata-ink-muted">Responsável: <span className="font-semibold text-tata-ink-soft">{guardianName}</span></p>
        <p className="text-xs text-tata-ink-muted">Versão: <span className="font-semibold text-tata-ink-soft">{version}</span></p>
      </div>

      <div className="p-5 flex flex-col gap-4">
        <ContractBody content={content} />

        <form action={formAction} className="flex flex-col gap-3">
          <input type="hidden" name="acceptanceId" value={acceptanceId} />
          <label className="flex items-start gap-2.5 text-sm text-tata-ink-soft">
            <input
              type="checkbox"
              name="agreed"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 w-5 h-5 shrink-0 accent-tata-green"
            />
            Li e concordo com os termos apresentados neste contrato.
          </label>

          {state?.error && (
            <p role="alert" className="text-sm text-tata-coral-dark font-medium">
              {state.error}
            </p>
          )}

          <button
            type="submit"
            disabled={!agreed || pending}
            className="min-h-11 bg-tata-coral text-white rounded-xl px-6 font-[family-name:var(--font-baloo)] font-semibold text-sm disabled:opacity-50 transition-opacity"
          >
            {pending ? "Registrando..." : "ACEITAR CONTRATO"}
          </button>
        </form>
      </div>
    </div>
  );
}
