"use client";

import { useActionState } from "react";
import {
  MEAL_TYPE_LABELS,
  CONSUMPTION_LABELS,
  HYGIENE_TYPE_LABELS,
  ACTIVITY_CATEGORY_LABELS,
  INCIDENT_TYPE_LABELS,
} from "@/lib/labels";
import { formatTime } from "@/lib/date";
import { ActionDialogButton } from "./ActionDialogButton";
import { QuickActionForm } from "../../QuickActionForm";
import { MoodSelector } from "./MoodSelector";
import { PhotoUploadForm } from "./PhotoUploadForm";

const selectClass =
  "border border-[#ECE1CB] rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#1FA787] transition-colors bg-white";
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
      return { error: error instanceof Error ? error.message : "Não foi possível registrar. Tente novamente." };
    }
  }, null);

  return (
    <form action={formAction} className="contents">
      <input type="hidden" name="childId" value={childId} />
      {openSleep && <input type="hidden" name="sleepId" value={openSleep.id} />}
      <button
        type="submit"
        disabled={pending}
        className="min-h-24 flex flex-col items-center justify-center gap-1 bg-[#FFFDF8] rounded-2xl shadow-sm py-4 text-[#2E2418] hover:shadow-md transition-shadow disabled:opacity-60"
      >
        <span className="text-2xl" aria-hidden="true">😴</span>
        <span className="text-xs font-semibold font-[family-name:var(--font-baloo)]">
          {openSleep ? "Finalizar soneca" : "Iniciar soneca"}
        </span>
        {openSleep && <span className="text-[10px] text-[#9A8A72]">Desde {formatTime(openSleep.startTime)}</span>}
      </button>
      {state?.error && (
        <p role="alert" className="col-span-2 text-sm text-[#E85570] font-medium">
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
  addActivityAction,
  addMoodAction,
  addIncidentAction,
  addMedicationAdministrationAction,
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
  addActivityAction: ActionFn;
  addMoodAction: ActionFn;
  addIncidentAction: ActionFn;
  addMedicationAdministrationAction: ActionFn;
  uploadChildPhotoAction: ActionFn;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <ActionDialogButton icon="🍎" label="Alimentação" dialogTitle="Alimentação">
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

      <ActionDialogButton icon="🧼" label="Higiene" dialogTitle="Higiene">
        <QuickActionForm action={addHygieneAction} hiddenFields={{ childId }} successMessage="Higiene registrada" submitLabel="Registrar">
          <select name="type" className={selectClass} defaultValue="DIAPER_CHANGE">
            {Object.entries(HYGIENE_TYPE_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
          <input name="notes" placeholder="Observação (opcional)" className={inputClass} />
        </QuickActionForm>
      </ActionDialogButton>

      <ActionDialogButton icon="🎨" label="Atividade" dialogTitle="Atividade">
        <QuickActionForm action={addActivityAction} hiddenFields={{ childId }} successMessage="Atividade registrada" submitLabel="Registrar">
          <select name="category" className={selectClass} defaultValue="RECREATION">
            {Object.entries(ACTIVITY_CATEGORY_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
          <input name="description" placeholder="Descrição (opcional)" className={inputClass} />
        </QuickActionForm>
      </ActionDialogButton>

      <ActionDialogButton icon="😊" label="Humor" dialogTitle="Como a criança está?">
        <MoodSelector childId={childId} action={addMoodAction} />
      </ActionDialogButton>

      {medicationAuthorizations.length > 0 && (
        <ActionDialogButton icon="💊" label="Medicamento" dialogTitle="Administrar medicamento">
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

      <ActionDialogButton icon="⚠️" label="Ocorrência" dialogTitle="Registrar ocorrência">
        <QuickActionForm
          action={addIncidentAction}
          hiddenFields={{ childId }}
          successMessage="Ocorrência registrada"
          submitLabel="Registrar ocorrência"
          submitClassName="min-h-11 bg-[#E85570] text-white text-sm font-semibold rounded-xl py-3 font-[family-name:var(--font-baloo)] disabled:opacity-60"
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

      <ActionDialogButton icon="📷" label="Foto" dialogTitle="Adicionar foto">
        {!imageAuthorized ? (
          <p className="text-sm text-[#E85570]">Sem autorização de imagem — envio bloqueado.</p>
        ) : (
          <PhotoUploadForm childId={childId} revalidateTo={revalidateTo} action={uploadChildPhotoAction} />
        )}
      </ActionDialogButton>
    </div>
  );
}
