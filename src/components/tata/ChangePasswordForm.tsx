"use client";

import { useActionState, useRef } from "react";
import { changePasswordAction } from "@/lib/account-actions";

const inputClass =
  "min-h-11 border border-tata-border rounded-xl px-3 py-2 text-sm outline-none focus:border-tata-green transition-colors bg-tata-surface";
const labelClass = "text-sm font-semibold text-tata-ink-strong";

export function ChangePasswordForm() {
  const [state, formAction, pending] = useActionState(changePasswordAction, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={(formData) => {
        formAction(formData);
        formRef.current?.reset();
      }}
      className="flex flex-col gap-3"
    >
      <label className="flex flex-col gap-1.5">
        <span className={labelClass}>Senha atual</span>
        <input type="password" name="currentPassword" required autoComplete="current-password" className={inputClass} />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className={labelClass}>Nova senha</span>
        <input type="password" name="newPassword" required autoComplete="new-password" minLength={8} className={inputClass} />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className={labelClass}>Confirmar nova senha</span>
        <input type="password" name="confirmPassword" required autoComplete="new-password" minLength={8} className={inputClass} />
      </label>

      {state && "error" in state && (
        <p role="alert" className="text-sm text-tata-coral-dark font-medium">
          {state.error}
        </p>
      )}
      {state && "success" in state && (
        <p role="status" className="text-sm text-tata-green-dark font-medium">
          Senha alterada com sucesso.
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="self-start min-h-11 bg-tata-coral text-white rounded-xl px-6 py-2.5 font-[family-name:var(--font-baloo)] font-semibold text-sm disabled:opacity-60 transition-opacity"
      >
        {pending ? "Alterando..." : "Alterar senha"}
      </button>
    </form>
  );
}
