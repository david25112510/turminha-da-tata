import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const STORAGE_SCHEME = "storage://";
const SIGNED_URL_TTL_SECONDS = 5 * 60;
type S3Config = { bucket: string; region: string; endpoint?: string; accessKeyId: string; secretAccessKey: string };

function getS3Config(): S3Config | null {
  const bucket = process.env.STORAGE_S3_BUCKET;
  if (!bucket) return null;
  const accessKeyId = process.env.STORAGE_S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.STORAGE_S3_SECRET_ACCESS_KEY;
  if (!accessKeyId || !secretAccessKey) throw new Error("Storage S3 configurado sem credenciais completas.");
  return { bucket, region: process.env.STORAGE_S3_REGION || "auto", endpoint: process.env.STORAGE_S3_ENDPOINT || undefined, accessKeyId, secretAccessKey };
}

let cachedClient: S3Client | null = null;
function getClient(config: S3Config) {
  if (!cachedClient) cachedClient = new S3Client({ region: config.region, endpoint: config.endpoint, credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey }, forcePathStyle: Boolean(config.endpoint) });
  return cachedClient;
}

function normalizeKey(key: string) {
  const normalized = key.replace(/\\/g, "/").replace(/^\/+/, "");
  if (!normalized || normalized.includes("..") || normalized.includes("\0")) throw new Error("Chave de storage inválida.");
  return normalized;
}
function localPath(key: string) { return path.join(process.cwd(), ".data", "uploads", ...normalizeKey(key).split("/")); }
export function storedReference(key: string) { return `${STORAGE_SCHEME}${normalizeKey(key)}`; }
export function isStoredReference(value: string | null | undefined): value is `storage://${string}` { return Boolean(value?.startsWith(STORAGE_SCHEME)); }
export function keyFromStoredReference(value: string) { if (!isStoredReference(value)) throw new Error("Referência de storage inválida."); return normalizeKey(value.slice(STORAGE_SCHEME.length)); }

/** Grava objetos novos como privados e devolve somente uma referência opaca persistível. */
export async function uploadFile(key: string, buffer: Buffer, contentType: string): Promise<string> {
  const safeKey = normalizeKey(key);
  const config = getS3Config();
  if (config) {
    const configuredEncryption = process.env.STORAGE_S3_SERVER_SIDE_ENCRYPTION;
    if (configuredEncryption && configuredEncryption !== "AES256" && configuredEncryption !== "aws:kms") throw new Error("STORAGE_S3_SERVER_SIDE_ENCRYPTION inválido.");
    const encryption: "AES256" | "aws:kms" | undefined = configuredEncryption === "AES256" || configuredEncryption === "aws:kms" ? configuredEncryption : undefined;
    await getClient(config).send(new PutObjectCommand({ Bucket: config.bucket, Key: safeKey, Body: buffer, ContentType: contentType, CacheControl: "private, no-store", ServerSideEncryption: encryption }));
  }
  else { const target = localPath(safeKey); await mkdir(path.dirname(target), { recursive: true }); await writeFile(target, buffer); }
  return storedReference(safeKey);
}

/** Resolve referências novas para URL temporária; URLs antigas continuam legíveis durante a migração. */
export async function resolveStoredFileUrl(reference: string | null | undefined): Promise<string | null> {
  if (!reference) return null;
  if (!isStoredReference(reference)) return reference;
  const key = keyFromStoredReference(reference);
  const config = getS3Config();
  if (!config) return `/api/storage/${key.split("/").map(encodeURIComponent).join("/")}`;
  return getSignedUrl(getClient(config), new GetObjectCommand({ Bucket: config.bucket, Key: key }), { expiresIn: SIGNED_URL_TTL_SECONDS });
}

export async function readLocalStoredObject(key: string) { return readFile(localPath(key)); }
export function storageKeyFromReference(reference: string): string | null {
  if (isStoredReference(reference)) return keyFromStoredReference(reference);
  if (reference.startsWith("/uploads/")) return normalizeKey(reference.slice("/uploads/".length));
  const publicUrl = process.env.STORAGE_S3_PUBLIC_URL?.replace(/\/$/, "");
  if (publicUrl && reference.startsWith(`${publicUrl}/`)) return normalizeKey(reference.slice(publicUrl.length + 1));
  return null;
}

/** Falhas são propagadas para impedir exclusão enganosa do registro no banco. */
export async function deleteStoredObject(reference: string): Promise<void> {
  const key = storageKeyFromReference(reference);
  if (!key) throw new Error("Não foi possível identificar o objeto legado no storage. Migração manual necessária.");
  const config = getS3Config();
  if (config) await getClient(config).send(new DeleteObjectCommand({ Bucket: config.bucket, Key: key }));
  else if (reference.startsWith("/uploads/")) await unlink(path.join(process.cwd(), "public", "uploads", ...key.split("/")));
  else await unlink(localPath(key));
}

export const STORAGE_SIGNED_URL_TTL_SECONDS = SIGNED_URL_TTL_SECONDS;
