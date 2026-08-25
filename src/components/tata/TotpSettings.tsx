"use client";

import { useActionState } from "react";
import {
  generateTotpSetupAction,
  confirmTotpEnrollmentAction,
  disableTotpAction,
  type TotpSetupState,
  type ConfirmTotpState,
  type DisableTotpState,
} from "@/app/admin/configuracoes/actions";

const inputClass =
  "min-h-11 border border-tata-border rounded-xl px-3 py-2 text-sm outline-none focus:border-tata-green transition-colors bg-tata-surface";
const buttonClass =
  "self-start min-h-11 bg-tata-coral text-white rounded-xl px-6 py-2.5 font-[family-name:var(--font-baloo)] font-semibold text-sm disabled:opacity-60 transition-opacity";

function EnrollmentFlow() {
  const [setupState, generateAction, generating] = useActionState<TotpSetupState, FormData>(
    generateTotpSetupAction,
    undefined
  );
  const [confirmState, confirmAction, confirming] = useActionState<ConfirmTotpState, FormData>(
    confirmTotpEnrollmentAction,
    undefined
  );

  if (confirmState && "success" in confirmState) {
    return (
      <p role="status" className="text-sm text-tata-green-dark font-semibold">
        ✓ Autenticação em duas etapas ativada. Da próxima vez que entrar, vamos pedir o código do seu app.
      </p>
    );
  }

  if (setupState && "secret" in setupState) {
    return (
      <form action={confirmAction} className="flex flex-col gap-3">
        <input type="hidden" name="secret" value={setupState.secret} />
        <p className="text-sm text-tata-ink-soft">
          Abra o Google Authenticator, Authy ou outro app de sua preferência e adicione uma conta usando este
          segredo (ou a URI abaixo, se o app aceitar colar):
        </p>
        <div className="bg-tata-surface-alt rounded-xl p-3 flex flex-col gap-1">
          <span className="text-[10px] font-semibold text-tata-ink-muted uppercase tracking-wide">Segredo</span>
          <code className="text-sm font-mono text-tata-ink break-all">{setupState.secret}</code>
        </div>
        <div className="bg-tata-surface-alt rounded-xl p-3 flex flex-col gap-1">
          <span className="text-[10px] font-semibold text-tata-ink-muted uppercase tracking-wide">URI (otpauth://)</span>
          <code className="text-xs font-mono text-tata-ink break-all">{setupState.uri}</code>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold text-tata-ink-strong">Código de confirmação</span>
          <input
            type="text"
            name="code"
            inputMode="numeric"
            pattern="\d{6}"
            maxLength={6}
            required
            autoFocus
            placeholder="000000"
            className={`${inputClass} tracking-[0.3em] text-center max-w-[160px]`}
          />
        </label>

        {confirmState && "error" in confirmState && (
          <p role="alert" className="text-sm text-tata-coral-dark font-medium">
            {confirmState.error}
          </p>
        )}

        <button type="submit" disabled={confirming} className={buttonClass}>
          {confirming ? "Confirmando..." : "Confirmar e ativar"}
        </button>
      </form>
    );
  }

  return (
    <form action={generateAction} className="flex flex-col gap-3">
      <p className="text-sm text-tata-ink-soft">
        Adiciona uma segunda etapa ao login: além da senha, você vai precisar de um código gerado por um app
        autenticador no seu celular.
      </p>
      {setupState && "error" in setupState && (
        <p role="alert" className="text-sm text-tata-coral-dark font-medium">
          {setupState.error}
        </p>
      )}
      <button type="submit" disabled={generating} className={buttonClass}>
        {generating ? "Gerando..." : "Ativar autenticação em duas etapas"}
      </button>
    </form>
  );
}

function DisableFlow() {
  const [state, formAction, pending] = useActionState<DisableTotpState, FormData>(disableTotpAction, undefined);

  if (state && "success" in state) {
    return (
      <p role="status" className="text-sm text-tata-ink-soft">
        Autenticação em duas etapas desativada. Você pode ativá-la novamente quando quiser.
      </p>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <p className="text-sm text-tata-green-dark font-semibold">✓ Ativada</p>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-semibold text-tata-ink-strong">Confirme sua senha para desativar</span>
        <input type="password" name="currentPassword" required autoComplete="current-password" className={inputClass} />
      </label>
      {state && "error" in state && (
        <p role="alert" className="text-sm text-tata-coral-dark font-medium">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="self-start min-h-11 border border-tata-border text-tata-ink-soft rounded-xl px-6 py-2.5 font-[family-name:var(--font-baloo)] font-semibold text-sm disabled:opacity-60 transition-opacity"
      >
        {pending ? "Desativando..." : "Desativar"}
      </button>
    </form>
  );
}

export function TotpSettings({ enabled }: { enabled: boolean }) {
  return enabled ? <DisableFlow /> : <EnrollmentFlow />;
}
