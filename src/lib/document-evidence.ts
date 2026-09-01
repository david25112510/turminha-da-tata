import { createHash, randomUUID } from "node:crypto";

export function signatureDigest(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}

export function immutableSignatureKey(area: string, ownerId: string, acceptanceId: string, buffer: Buffer): string {
  return `${area}/${ownerId}/${acceptanceId}-${signatureDigest(buffer)}-${randomUUID()}.png`;
}

export function acceptedDocumentDigest(parts: string[], signatureUrl: string, signature: Buffer): string {
  return createHash("sha256")
    .update(JSON.stringify({ parts, signatureUrl, signatureSha256: signatureDigest(signature) }))
    .digest("hex");
}
