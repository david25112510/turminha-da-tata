/**
 * Detecta o tipo real de uma imagem pelos magic bytes (assinatura binária), não pelo `file.type`
 * reportado pelo browser — esse último é só uma sugestão do cliente e pode ser forjado (renomear um
 * arquivo malicioso para `foto.png` e declarar `image/png` sem o conteúdo bater). Cobre exatamente
 * os três formatos aceitos em todo o app (ver src/lib/photo-actions.ts e afins) — sem lib nova.
 */
export type AllowedImageType = "image/png" | "image/jpeg" | "image/webp";

export function detectImageType(buffer: Buffer): AllowedImageType | null {
  if (buffer.length < 12) return null;

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return "image/png";
  }

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }

  // WEBP: "RIFF" .... "WEBP"
  if (buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP") {
    return "image/webp";
  }

  return null;
}

export function extensionFor(type: AllowedImageType): string {
  return type === "image/png" ? "png" : type === "image/webp" ? "webp" : "jpg";
}
