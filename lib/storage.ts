import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

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
const PUBLIC_BASE_URL = process.env.STORAGE_PUBLIC_URL!; // e.g. https://cdn.ineedposn.com

export async function uploadFile(file: File, key: string): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: file.type,
    })
  );
  return `${PUBLIC_BASE_URL}/${key}`;
}
