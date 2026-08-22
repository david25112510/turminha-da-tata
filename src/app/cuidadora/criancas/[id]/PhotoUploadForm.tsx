"use client";

import { useActionState, useState } from "react";

type ActionState = { success?: string; error?: string } | null;

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

  const [state, formAction, pending] = useActionState<ActionState, FormData>(async (_prev, formData) => {
    try {
      await action(formData);
      setPreviewUrl(null);
      return { success: "Foto enviada" };
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Não foi possível enviar a foto. Tente novamente." };
    }
  }, null);

  return (
    <form action={formAction} className="flex flex-col gap-2.5">
      <input type="hidden" name="childId" value={childId} />
      <input type="hidden" name="revalidateTo" value={revalidateTo} />

      {previewUrl && (
        // eslint-disable-next-line @next/next/no-img-element -- blob: preview URL, next/image não aceita.
        <img src={previewUrl} alt="Pré-visualização da foto selecionada" className="w-full aspect-square object-cover rounded-xl" />
      )}

      <label className="flex flex-col gap-1 text-xs font-semibold text-[#6F6252]">
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
      <label className="flex flex-col gap-1 text-xs font-semibold text-[#6F6252]">
        Legenda (opcional)
        <input
          name="caption"
          placeholder="Ex.: brincando no parquinho"
          className="border border-[#ECE1CB] rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#1FA787] transition-colors bg-white"
        />
      </label>

      <button
        type="submit"
        disabled={pending}
        className="min-h-11 bg-[#1FA787] text-white text-sm font-semibold rounded-xl py-3 font-[family-name:var(--font-baloo)] disabled:opacity-60 transition-opacity"
      >
        {pending ? "Enviando..." : "Enviar foto"}
      </button>

      {state?.success && (
        <p role="status" className="text-sm text-[#1F8A6E] font-semibold">
          ✓ {state.success}
        </p>
      )}
      {state?.error && (
        <p role="alert" className="text-sm text-[#E85570] font-medium">
          {state.error}
        </p>
      )}
    </form>
  );
}
