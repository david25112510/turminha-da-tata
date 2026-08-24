"use client";

import { useActionState } from "react";
import Link from "next/link";
import { createCaregiverAction } from "../actions";

const inputClass =
  "min-h-11 border border-tata-border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-tata-green transition-colors bg-tata-surface";
const labelClass = "text-sm font-semibold text-tata-ink-strong";

export default function NewCaregiverPage() {
  const [state, formAction, pending] = useActionState(createCaregiverAction, undefined);

  if (state && "success" in state) {
    return (
      <div className="p-4 sm:p-8 flex flex-col gap-6 max-w-2xl">
        <h1 className="font-[family-name:var(--font-baloo)] font-semibold text-xl text-tata-ink">
          Nova cuidadora
        </h1>
        <div className="bg-tata-surface rounded-2xl shadow-sm p-6 flex flex-col gap-4">
          <p className="text-sm text-tata-green-dark font-medium">
            {state.name} foi cadastrada com sucesso e já pode acessar o app.
          </p>
          <div className="flex gap-3">
            <Link
              href={`/admin/cuidadoras/${state.id}`}
              className="min-h-11 flex items-center bg-tata-coral text-white rounded-xl px-6 font-[family-name:var(--font-baloo)] font-semibold text-sm"
            >
              Ver cuidadora
            </Link>
            <Link
              href="/admin/cuidadoras"
              className="min-h-11 flex items-center text-tata-ink-soft text-sm font-semibold"
            >
              Voltar para a lista
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 flex flex-col gap-6 max-w-2xl">
      <h1 className="font-[family-name:var(--font-baloo)] font-semibold text-xl text-tata-ink">
        Nova cuidadora
      </h1>

      <form action={formAction} className="bg-tata-surface rounded-2xl shadow-sm p-6 flex flex-col gap-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="flex flex-col gap-1.5 sm:col-span-2">
            <span className={labelClass}>Nome completo</span>
            <input name="name" required className={inputClass} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>Telefone</span>
            <input name="phone" required className={inputClass} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>CPF</span>
            <input name="cpf" className={inputClass} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>Data de nascimento</span>
            <input type="date" name="birthDate" className={inputClass} />
          </label>
        </div>

        <div className="h-px bg-tata-border" />

        <div className="flex flex-col gap-1.5">
          <span className={labelClass}>Observações</span>
          <textarea name="notes" rows={3} className={inputClass} />
        </div>

        <div className="h-px bg-tata-border" />

        <span className="font-[family-name:var(--font-baloo)] font-semibold text-sm text-tata-ink">
          Acesso ao app
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>E-mail de acesso</span>
            <input type="email" name="email" required className={inputClass} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>Senha inicial</span>
            <input type="text" name="tempPassword" required minLength={8} className={inputClass} />
          </label>
        </div>
        <p className="text-xs text-tata-ink-muted -mt-2">
          A cuidadora poderá alterar essa senha assim que fizer o primeiro acesso, em &ldquo;Meu perfil&rdquo;.
        </p>

        {state && "error" in state && (
          <p role="alert" className="text-sm text-tata-coral-dark font-medium">
            {state.error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="min-h-11 bg-tata-coral text-white rounded-xl py-3 font-[family-name:var(--font-baloo)] font-semibold text-sm self-start px-8 disabled:opacity-60 transition-opacity"
        >
          {pending ? "Salvando..." : "Salvar"}
        </button>
      </form>
    </div>
  );
}
