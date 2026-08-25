"use client";

import { useActionState, useEffect, useState } from "react";
import { useDialogClose } from "../../DialogContext";
import { toUserMessage } from "@/lib/user-error-message";

type ActionState = { success?: string; error?: string } | null;

const AUTO_CLOSE_DELAY_MS = 1100;

/** Upload de foto com preview antes de enviar — reaproveita uploadChildPhotoAction (src/lib/photo-actions.ts) sem alterá-la. */
export function PhotoUploadForm({
  childId,
  revalidateTo,
  action,
}: {
  childId: string;
  revalidateTo: string;
  action: (formData: FormData) => Promise<void>;
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const closeDialog = useDialogClose();

  const [state, formAction, pending] = useActionState<ActionState, FormData>(async (_prev, formData) => {
    try {
      await action(formData);
      setPreviewUrl(null);
      return { success: "Foto enviada" };
    } catch (error) {
      return { error: toUserMessage(error, "Não foi possível enviar a foto. Tente novamente.") };
    }
  }, null);

  useEffect(() => {
    if (!state?.success || !closeDialog) return;
    const timer = setTimeout(closeDialog, AUTO_CLOSE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [state?.success, closeDialog]);

  return (
    <form action={formAction} className="flex flex-col gap-2.5">
      <input type="hidden" name="childId" value={childId} />
      <input type="hidden" name="revalidateTo" value={revalidateTo} />

      {previewUrl && (
        // eslint-disable-next-line @next/next/no-img-element -- blob: preview URL, next/image não aceita.
        <img src={previewUrl} alt="Pré-visualização da foto selecionada" className="w-full aspect-square object-cover rounded-xl" />
      )}

      <label className="flex flex-col gap-1 text-xs font-semibold text-tata-ink-faint">
        Foto
        <input
          type="file"
          name="photo"
          accept="image/png,image/jpeg,image/webp"
          required
          onChange={(e) => {
            const file = e.target.files?.[0];
            setPreviewUrl(file ? URL.createObjectURL(file) : null);
          }}
          className="text-sm"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs font-semibold text-tata-ink-faint">
        Legenda (opcional)
        <input
          name="caption"
          placeholder="Ex.: brincando no parquinho"
          className="border border-tata-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-tata-green transition-colors bg-tata-surface"
        />
      </label>

      <button
        type="submit"
        disabled={pending}
        className="min-h-11 bg-tata-green text-white text-sm font-semibold rounded-xl py-3 font-[family-name:var(--font-baloo)] disabled:opacity-60 transition-opacity"
      >
        {pending ? "Enviando..." : "Enviar foto"}
      </button>

      {state?.success && (
        <p role="status" className="text-sm text-tata-green-dark font-semibold">
          ✓ {state.success}
        </p>
      )}
      {state?.error && (
        <p role="alert" className="text-sm text-tata-coral-dark font-medium">
          {state.error}
        </p>
      )}
    </form>
  );
}
