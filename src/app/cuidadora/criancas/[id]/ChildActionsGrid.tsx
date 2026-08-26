"use client";

import { useActionState, useEffect, useState } from "react";
import {
  MEAL_TYPE_LABELS,
  CONSUMPTION_LABELS,
  HYGIENE_TYPE_LABELS,
  DIAPER_TYPE_LABELS,
  WATER_AMOUNT_LABELS,
  ACTIVITY_CATEGORY_LABELS,
  INCIDENT_TYPE_LABELS,
} from "@/lib/labels";
import { formatDuration, formatTime } from "@/lib/date";
import { toUserMessage } from "@/lib/user-error-message";
import { ActionDialogButton } from "./ActionDialogButton";
import { QuickActionForm } from "../../QuickActionForm";
import { MoodSelector } from "./MoodSelector";
import { PhotoUploadForm } from "./PhotoUploadForm";

const selectClass =
  "border border-tata-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-tata-green transition-colors bg-tata-surface";
const inputClass = selectClass;

type ActionFn = (formData: FormData) => Promise<void>;
type MedicationAuthorization = { id: string; medication: string; dosage: string };
type OpenSleep = { id: string; startTime: Date } | null;

type SleepActionState = { error: string } | null;

function SleepButton({
  childId,
  openSleep,
  startSleepAction,
  endSleepAction,
}: {
  childId: string;
  openSleep: OpenSleep;
  startSleepAction: ActionFn;
  endSleepAction: ActionFn;
}) {
  const [state, formAction, pending] = useActionState<SleepActionState, FormData>(async (_prev, formData) => {
    try {
      await (openSleep ? endSleepAction : startSleepAction)(formData);
      return null;
    } catch (error) {
      return { error: toUserMessage(error, "Não foi possível registrar. Tente novamente.") };
    }
  }, null);

  // "now" só é definido dentro do useEffect (nunca durante a renderização inicial) — calcular a
  // duração a partir de Date.now() direto no render divergiria entre servidor e cliente e quebraria
  // a hidratação, mesmo motivo já corrigido em OfflineBanner.tsx. No primeiro render (antes do
  // useEffect rodar) "now" é null e o texto fica exatamente como antes ("Desde HH:mm" — ver
  // sinceLabel abaixo, que só usa "now" quando openSleep também está presente, então não precisa
  // resetar para null quando a soneca termina). 30s de intervalo — é só um indicador de quanto tempo
  // já passou, não um cronômetro de precisão, e a cuidadora pode deixar essa tela aberta por horas.
  const [now, setNow] = useState<Date | null>(null);
  const openSleepId = openSleep?.id ?? null;
  useEffect(() => {
    if (!openSleepId) return;
    // Guarda de hidratação intencional: "now" só pode existir depois de montado (ver comentário
    // acima), então a primeira leitura do relógio precisa mesmo acontecer aqui, não em um cálculo
    // derivado do render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(new Date());
    const interval = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(interval);
  }, [openSleepId]);

  const sinceLabel = openSleep
    ? now
      ? `${formatDuration(openSleep.startTime.getTime(), now.getTime())} · desde ${formatTime(openSleep.startTime)}`
      : `Desde ${formatTime(openSleep.startTime)}`
    : null;

  return (
    <form action={formAction} className="contents">
      <input type="hidden" name="childId" value={childId} />
      {openSleep && <input type="hidden" name="sleepId" value={openSleep.id} />}
      <button
        type="submit"
        disabled={pending}
        className="min-h-24 flex flex-col items-center justify-center gap-1.5 bg-tata-surface rounded-tata-lg shadow-tata-card py-4 text-tata-ink transition-all hover:shadow-tata-card-hover active:scale-[0.97] disabled:opacity-60"
      >
        <span className="w-11 h-11 rounded-full flex items-center justify-center text-2xl bg-tata-lilac-soft" aria-hidden="true">😴</span>
        <span className="text-xs font-semibold font-[family-name:var(--font-baloo)]">
          {openSleep ? "Finalizar soneca" : "Iniciar soneca"}
        </span>
        {sinceLabel && <span className="text-[10px] text-tata-ink-muted">{sinceLabel}</span>}
      </button>
      {state?.error && (
        <p role="alert" className="col-span-2 text-sm text-tata-coral-dark font-medium">
          {state.error}
        </p>
      )}
    </form>
  );
}

export function ChildActionsGrid({
  childId,
  revalidateTo,
  imageAuthorized,
  openSleep,
  medicationAuthorizations,
  addMealAction,
  startSleepAction,
  endSleepAction,
  addHygieneAction,
  addWaterAction,
  addActivityAction,
  addMoodAction,
  addIncidentAction,
  addMedicationAdministrationAction,
  addObservationAction,
  uploadChildPhotoAction,
}: {
  childId: string;
  revalidateTo: string;
  imageAuthorized: boolean;
  openSleep: OpenSleep;
  medicationAuthorizations: MedicationAuthorization[];
  addMealAction: ActionFn;
  startSleepAction: ActionFn;
  endSleepAction: ActionFn;
  addHygieneAction: ActionFn;
  addWaterAction: ActionFn;
  addActivityAction: ActionFn;
  addMoodAction: ActionFn;
  addIncidentAction: ActionFn;
  addMedicationAdministrationAction: ActionFn;
  addObservationAction: ActionFn;
  uploadChildPhotoAction: ActionFn;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <ActionDialogButton icon="🍎" label="Alimentação" dialogTitle="Alimentação" accent="yellow">
        <QuickActionForm action={addMealAction} hiddenFields={{ childId }} successMessage="Alimentação registrada" submitLabel="Registrar">
          <select name="mealType" className={selectClass} defaultValue="SNACK">
            {Object.entries(MEAL_TYPE_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
          <select name="consumption" className={selectClass} defaultValue="WELL">
            {Object.entries(CONSUMPTION_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
          <input name="notes" placeholder="Observação (opcional)" className={inputClass} />
        </QuickActionForm>
      </ActionDialogButton>

      <SleepButton childId={childId} openSleep={openSleep} startSleepAction={startSleepAction} endSleepAction={endSleepAction} />

      <ActionDialogButton icon="🧷" label="Fralda" dialogTitle="Troca de fralda" accent="yellow">
        <QuickActionForm action={addHygieneAction} hiddenFields={{ childId, type: "DIAPER_CHANGE" }} successMessage="Fralda registrada" submitLabel="Registrar">
          <select name="diaperType" className={selectClass} defaultValue="WET">
            {Object.entries(DIAPER_TYPE_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
          <input name="notes" placeholder="Observação (opcional)" className={inputClass} />
        </QuickActionForm>
      </ActionDialogButton>

      <ActionDialogButton icon="🧼" label="Higiene" dialogTitle="Higiene" accent="blue">
        <QuickActionForm action={addHygieneAction} hiddenFields={{ childId }} successMessage="Higiene registrada" submitLabel="Registrar">
          <select name="type" className={selectClass} defaultValue="BATHROOM">
            {Object.entries(HYGIENE_TYPE_LABELS)
              .filter(([v]) => v !== "DIAPER_CHANGE")
              .map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
          </select>
          <input name="notes" placeholder="Observação (opcional)" className={inputClass} />
        </QuickActionForm>
      </ActionDialogButton>

      <ActionDialogButton icon="💧" label="Água" dialogTitle="Água" accent="blue">
        <QuickActionForm action={addWaterAction} hiddenFields={{ childId }} successMessage="Água registrada" submitLabel="Registrar">
          <select name="amount" className={selectClass} defaultValue="MEDIUM">
            {Object.entries(WATER_AMOUNT_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
          <input name="notes" placeholder="Observação (opcional)" className={inputClass} />
        </QuickActionForm>
      </ActionDialogButton>

      <ActionDialogButton icon="🎨" label="Atividade" dialogTitle="Atividade" accent="lilac">
        <QuickActionForm action={addActivityAction} hiddenFields={{ childId }} successMessage="Atividade registrada" submitLabel="Registrar">
          <select name="category" className={selectClass} defaultValue="RECREATION">
            {Object.entries(ACTIVITY_CATEGORY_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
          <input name="description" placeholder="Descrição (opcional)" className={inputClass} />
        </QuickActionForm>
      </ActionDialogButton>

      <ActionDialogButton icon="😊" label="Humor" dialogTitle="Como a criança está?" accent="yellow">
        <MoodSelector childId={childId} action={addMoodAction} />
      </ActionDialogButton>

      {medicationAuthorizations.length > 0 && (
        <ActionDialogButton icon="💊" label="Medicamento" dialogTitle="Administrar medicamento" accent="green">
          <QuickActionForm
            action={addMedicationAdministrationAction}
            hiddenFields={{ childId }}
            successMessage="Medicamento registrado"
            submitLabel="Confirmar administração"
          >
            <select name="authorizationId" className={selectClass}>
              {medicationAuthorizations.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.medication} — {m.dosage}
                </option>
              ))}
            </select>
            <input name="notes" placeholder="Observação (opcional)" className={inputClass} />
          </QuickActionForm>
        </ActionDialogButton>
      )}

      <ActionDialogButton icon="⚠️" label="Ocorrência" dialogTitle="Registrar ocorrência" accent="coral">
        <QuickActionForm
          action={addIncidentAction}
          hiddenFields={{ childId }}
          successMessage="Ocorrência registrada"
          submitLabel="Registrar ocorrência"
          submitClassName="min-h-11 bg-tata-coral-dark text-white text-sm font-semibold rounded-xl py-3 font-[family-name:var(--font-baloo)] disabled:opacity-60"
        >
          <select name="type" className={selectClass} defaultValue="OTHER">
            {Object.entries(INCIDENT_TYPE_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
          <input name="description" placeholder="Descrição" required className={inputClass} />
          <input name="actionsTaken" placeholder="Providências (opcional)" className={inputClass} />
        </QuickActionForm>
      </ActionDialogButton>

      <ActionDialogButton icon="📝" label="Observação" dialogTitle="Registrar observação" accent="lilac">
        <QuickActionForm action={addObservationAction} hiddenFields={{ childId }} successMessage="Observação registrada" submitLabel="Registrar">
          <textarea name="text" required rows={3} placeholder="Ex: Maria ficou mais sonolenta depois do almoço." className={`${inputClass} resize-none`} />
        </QuickActionForm>
      </ActionDialogButton>

      <ActionDialogButton icon="📷" label="Foto" dialogTitle="Adicionar foto" accent="blue">
        {!imageAuthorized ? (
          <p className="text-sm text-tata-coral-dark">Sem autorização de imagem — envio bloqueado.</p>
        ) : (
          <PhotoUploadForm childId={childId} revalidateTo={revalidateTo} action={uploadChildPhotoAction} />
        )}
      </ActionDialogButton>
    </div>
  );
}
