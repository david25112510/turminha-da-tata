import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

type S3Config = {
  bucket: string;
  region: string;
  endpoint: string | undefined;
  accessKeyId: string;
  secretAccessKey: string;
  publicUrl: string;
};

function getS3Config(): S3Config | null {
  const bucket = process.env.STORAGE_S3_BUCKET;
  if (!bucket) return null;

  const accessKeyId = process.env.STORAGE_S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.STORAGE_S3_SECRET_ACCESS_KEY;
  const publicUrl = process.env.STORAGE_S3_PUBLIC_URL;
  if (!accessKeyId || !secretAccessKey || !publicUrl) {
    throw new Error(
      "STORAGE_S3_BUCKET está definido, mas faltam STORAGE_S3_ACCESS_KEY_ID, STORAGE_S3_SECRET_ACCESS_KEY ou STORAGE_S3_PUBLIC_URL."
    );
  }

  return {
    bucket,
    region: process.env.STORAGE_S3_REGION || "auto",
    endpoint: process.env.STORAGE_S3_ENDPOINT || undefined,
    accessKeyId,
    secretAccessKey,
    publicUrl,
  };
}

let cachedClient: S3Client | null = null;

function getClient(config: S3Config) {
  if (!cachedClient) {
    cachedClient = new S3Client({
      region: config.region,
      endpoint: config.endpoint,
      credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
      forcePathStyle: Boolean(config.endpoint),
    });
  }
  return cachedClient;
}

async function uploadToLocalDisk(key: string, buffer: Buffer): Promise<string> {
  const segments = key.split("/");
  const fileName = segments.pop()!;
  const dir = path.join(process.cwd(), "public", "uploads", ...segments);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, fileName), buffer);
  return `/uploads/${key}`;
}

/**
 * Uploads a file and returns its public URL. Uses an S3-compatible bucket (AWS S3, Cloudflare R2, or any
 * S3-compatible provider) when STORAGE_S3_BUCKET is configured; otherwise falls back to local disk under
 * public/uploads/ so local development works without cloud credentials.
 */
export async function uploadFile(key: string, buffer: Buffer, contentType: string): Promise<string> {
  const config = getS3Config();
  if (!config) return uploadToLocalDisk(key, buffer);

  const client = getClient(config);
  await client.send(
    new PutObjectCommand({ Bucket: config.bucket, Key: key, Body: buffer, ContentType: contentType })
  );
  return `${config.publicUrl.replace(/\/$/, "")}/${key}`;
}
