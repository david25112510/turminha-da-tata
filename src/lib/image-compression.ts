/**
 * Redimensiona/recomprime uma foto tirada pelo celular antes do upload — sem lib nova, só Canvas API
 * nativa do browser (createImageBitmap + canvas.toBlob). Roda só no client; se algo no caminho falhar
 * (formato não decodificável, canvas indisponível), devolve o arquivo original em vez de travar o envio.
 */
export async function compressImage(file: File, maxDimension = 1600, quality = 0.8): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
    if (!blob) return file;

    return new File([blob], file.name.replace(/\.\w+$/, ".jpg"), { type: "image/jpeg" });
  } catch {
    return file;
  }
}
