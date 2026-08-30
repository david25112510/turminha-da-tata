"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { RELATIONSHIP_LABELS } from "@/lib/labels";
import { requestSignupAction, type SignupState } from "./actions";
import { HumanVerification } from "@/components/security/HumanVerification";

const inputClass =
  "min-h-11 border border-tata-border rounded-xl px-4 py-3 text-sm outline-none focus:border-tata-green transition-colors";
const labelClass = "flex flex-col gap-1.5 text-sm";

export function SignupForm() {
  const [state, formAction, pending] = useActionState<SignupState, FormData>(requestSignupAction, undefined);
  const [role, setRole] = useState<"CAREGIVER" | "GUARDIAN">("GUARDIAN");

  if (state && "success" in state) {
    return (
      <div className="flex flex-col gap-3 text-center">
        <span className="text-4xl" aria-hidden="true">💛</span>
        <h1 className="font-[family-name:var(--font-baloo)] font-semibold text-xl text-tata-ink">
          Solicitação enviada!
        </h1>
        <p className="text-sm text-tata-ink-soft">
          A escola vai analisar seu cadastro. Você recebe acesso assim que for aprovado — não é
          preciso enviar de novo.
        </p>
        <Link href="/login" className="text-sm font-semibold text-tata-green-dark hover:underline">
          Voltar para o login
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="w-full max-w-sm mx-auto flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="font-[family-name:var(--font-baloo)] font-semibold text-2xl text-tata-ink">Criar conta</h1>
        <p className="text-sm text-tata-ink-soft">Sua conta fica pendente até a escola aprovar.</p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setRole("GUARDIAN")}
          className={`min-h-11 rounded-xl text-sm font-semibold border transition-colors ${
            role === "GUARDIAN" ? "bg-tata-green text-white border-tata-green" : "border-tata-border text-tata-ink-soft"
          }`}
        >
          Sou responsável
        </button>
        <button
          type="button"
          onClick={() => setRole("CAREGIVER")}
          className={`min-h-11 rounded-xl text-sm font-semibold border transition-colors ${
            role === "CAREGIVER" ? "bg-tata-green text-white border-tata-green" : "border-tata-border text-tata-ink-soft"
          }`}
        >
          Sou cuidadora
        </button>
      </div>
      <input type="hidden" name="role" value={role} />

      <label className={labelClass}>
        <span className="font-semibold text-tata-ink-strong">Nome completo</span>
        <input name="name" required className={inputClass} />
      </label>

      <label className={labelClass}>
        <span className="font-semibold text-tata-ink-strong">E-mail</span>
        <input type="email" name="email" required className={inputClass} />
      </label>

      <label className={labelClass}>
        <span className="font-semibold text-tata-ink-strong">Telefone</span>
        <input name="phone" required placeholder="(11) 99999-9999" className={inputClass} />
      </label>

      <label className={labelClass}>
        <span className="font-semibold text-tata-ink-strong">CPF (opcional)</span>
        <input name="cpf" className={inputClass} />
      </label>

      {role === "GUARDIAN" && (
        <>
          <label className={labelClass}>
            <span className="font-semibold text-tata-ink-strong">Código de convite</span>
            <input
              name="inviteCode"
              required
              placeholder="Fornecido pela escola"
              autoCapitalize="characters"
              className={`${inputClass} tracking-widest uppercase`}
            />
            <span className="text-xs text-tata-ink-muted">
              A escola gera esse código na matrícula e repassa pessoalmente à família.
            </span>
          </label>
          <label className={labelClass}>
            <span className="font-semibold text-tata-ink-strong">Parentesco com a criança</span>
            <select name="relationship" required defaultValue="" className={inputClass}>
              <option value="" disabled>
                Selecione
              </option>
              {Object.entries(RELATIONSHIP_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </>
      )}

      <label className={labelClass}>
        <span className="font-semibold text-tata-ink-strong">Senha</span>
        <input type="password" name="password" required autoComplete="new-password" className={inputClass} />
      </label>
      <label className={labelClass}>
        <span className="font-semibold text-tata-ink-strong">Confirmar senha</span>
        <input type="password" name="confirmPassword" required autoComplete="new-password" className={inputClass} />
      </label>

      {state && "error" in state && (
        <p role="alert" className="text-sm text-tata-coral-dark font-medium">
          {state.error}
        </p>
      )}

      <HumanVerification pending={pending} />

      <button
        type="submit"
        disabled={pending}
        className="min-h-11 bg-tata-coral text-white rounded-xl py-3 font-[family-name:var(--font-baloo)] font-semibold text-sm disabled:opacity-60 transition-opacity"
      >
        {pending ? "Enviando..." : "Solicitar cadastro"}
      </button>

      <p className="text-center text-xs text-tata-ink-muted">
        Já tem conta?{" "}
        <Link href="/login" className="font-semibold text-tata-green-dark hover:underline">
          Entrar
        </Link>
      </p>
    </form>
  );
}
