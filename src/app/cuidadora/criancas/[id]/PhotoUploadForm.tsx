"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useDialogClose } from "../../DialogContext";
import { toUserMessage } from "@/lib/user-error-message";
import { compressImage } from "@/lib/image-compression";

type ActionState = { success?: string; error?: string } | null;

const AUTO_CLOSE_DELAY_MS = 1100;

/**
 * "Registrar Momento" — abre a câmera do celular direto (capture="environment", mesmo <input
 * type="file"> de sempre, sem getUserMedia/canvas de captura ao vivo: mais simples e robusto em
 * qualquer navegador mobile) e comprime a foto no client antes do upload (redimensiona para no
 * máximo 1600px do lado maior, reencodifica em JPEG ~80% de qualidade — ver src/lib/image-compression.ts)
 * para não mandar o arquivo cru de 10+ MB que uma câmera de celular produz. Reaproveita
 * uploadChildPhotoAction (src/lib/photo-actions.ts) sem alterá-la.
 */
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
  const [compressedFile, setCompressedFile] = useState<File | null>(null);
  const [compressing, setCompressing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const closeDialog = useDialogClose();

  const [state, formAction, pending] = useActionState<ActionState, FormData>(async (_prev, formData) => {
    if (compressedFile) formData.set("photo", compressedFile);
    try {
      await action(formData);
      setPreviewUrl(null);
      setCompressedFile(null);
      return { success: "Momento registrado" };
    } catch (error) {
      return { error: toUserMessage(error, "Não foi possível enviar a foto. Tente novamente.") };
    }
  }, null);

  useEffect(() => {
    if (!state?.success || !closeDialog) return;
    const timer = setTimeout(closeDialog, AUTO_CLOSE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [state?.success, closeDialog]);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) {
      setPreviewUrl(null);
      setCompressedFile(null);
      return;
    }
    setCompressing(true);
    const compressed = await compressImage(file);
    setCompressedFile(compressed);
    setPreviewUrl(URL.createObjectURL(compressed));
    setCompressing(false);
  }

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
          ref={inputRef}
          type="file"
          name="photo"
          accept="image/png,image/jpeg,image/webp"
          capture="environment"
          required
          onChange={handleFileChange}
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
        disabled={pending || compressing}
        className="min-h-11 bg-tata-green text-white text-sm font-semibold rounded-xl py-3 font-[family-name:var(--font-baloo)] disabled:opacity-60 transition-opacity"
      >
        {compressing ? "Preparando foto..." : pending ? "Enviando..." : "Enviar"}
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
