"use client";

import { createContext, useContext } from "react";

/** Permite que um formulário dentro de um <dialog> (ActionDialogButton) feche o diálogo sozinho após sucesso. */
const DialogCloseContext = createContext<(() => void) | null>(null);

export const DialogCloseProvider = DialogCloseContext.Provider;

export function useDialogClose() {
  return useContext(DialogCloseContext);
}
