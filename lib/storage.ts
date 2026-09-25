import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { nanoid } from "nanoid";

// Works with Cloudflare R2 or any S3-compatible provider — set
// STORAGE_ENDPOINT to R2's endpoint, or omit it to use real AWS S3.
const s3 = new S3Client({
  region: "auto",
  endpoint: process.env.STORAGE_ENDPOINT,
  credentials: {
    accessKeyId: process.env.STORAGE_ACCESS_KEY_ID!,
    secretAccessKey: process.env.STORAGE_SECRET_ACCESS_KEY!,
  },
});

const BUCKET = process.env.STORAGE_BUCKET!;
const PUBLIC_BASE_URL = process.env.STORAGE_PUBLIC_URL!; // e.g. https://cdn.ineedbio.com

function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-100);
}

/**
 * Uploads a file under a folder prefix (e.g. "slips", "attachments",
 * "covers", "page-blocks") with a collision-safe, sanitized key.
 * Returns the public URL.
 */
export async function uploadFile(file: File, folder: string): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const key = `${folder}/${nanoid(10)}-${sanitizeFileName(file.name)}`;

  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: file.type || "application/octet-stream",
    })
  );
  return `${PUBLIC_BASE_URL}/${key}`;
}

/** Deletes a file given its public URL (used when an attachment/cover is removed). */
export async function deleteFile(publicUrl: string): Promise<void> {
  if (!publicUrl.startsWith(PUBLIC_BASE_URL)) return; // not ours, ignore
  const key = publicUrl.slice(PUBLIC_BASE_URL.length + 1);
  await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}
