import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { nanoid } from "nanoid";
import { getServerEnv } from "@/lib/server/env";
import {
  INSPIRATION_UPLOAD,
  type InspirationContentType,
} from "@/lib/constants/inspiration";

let cached: S3Client | null = null;

function getClient(): S3Client {
  if (cached) return cached;
  const env = getServerEnv();
  cached = new S3Client({
    region: "auto",
    endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    },
  });
  return cached;
}

interface UploadInput {
  pathname: string;
  buffer: Buffer;
  contentType: string;
}

export async function uploadScreenshot(input: UploadInput): Promise<string> {
  const env = getServerEnv();
  const key = buildKey(env.R2_KEY_PREFIX, input.pathname);

  await getClient().send(
    new PutObjectCommand({
      Bucket: env.R2_BUCKET_NAME,
      Key: key,
      Body: input.buffer,
      ContentType: input.contentType,
      CacheControl: "public, max-age=31536000, immutable",
    })
  );

  const base = env.R2_PUBLIC_URL.replace(/\/+$/, "");
  return `${base}/${key}`;
}

function buildKey(prefix: string, pathname: string): string {
  const cleanPrefix = prefix.replace(/\/+$/, "").replace(/^\/+/, "");
  const cleanPath = pathname.replace(/^\/+/, "");
  return cleanPrefix ? `${cleanPrefix}/${cleanPath}` : cleanPath;
}

export function buildPublicUrl(pathname: string): string {
  const env = getServerEnv();
  const key = buildKey(env.R2_KEY_PREFIX, pathname);
  const base = env.R2_PUBLIC_URL.replace(/\/+$/, "");
  return `${base}/${key}`;
}

export async function deleteScreenshotByUrl(publicUrl: string): Promise<void> {
  const env = getServerEnv();
  const base = env.R2_PUBLIC_URL.replace(/\/+$/, "");
  if (!publicUrl.startsWith(`${base}/`)) return;
  const key = publicUrl.slice(base.length + 1);
  if (!key) return;

  await getClient().send(
    new DeleteObjectCommand({
      Bucket: env.R2_BUCKET_NAME,
      Key: key,
    })
  );
}

interface UploadJsonInput {
  pathname: string;
  data: unknown;
}

export async function uploadJsonBlob(input: UploadJsonInput): Promise<string> {
  const env = getServerEnv();
  const key = buildKey(env.R2_KEY_PREFIX, input.pathname);
  const body = Buffer.from(JSON.stringify(input.data));

  await getClient().send(
    new PutObjectCommand({
      Bucket: env.R2_BUCKET_NAME,
      Key: key,
      Body: body,
      ContentType: "application/json",
      CacheControl: "public, max-age=31536000, immutable",
    })
  );

  const base = env.R2_PUBLIC_URL.replace(/\/+$/, "");
  return `${base}/${key}`;
}

export async function downloadJsonBlob<T>(publicUrl: string): Promise<T | null> {
  try {
    const response = await fetch(publicUrl, { cache: "no-store" });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export async function deleteJsonByUrl(publicUrl: string): Promise<void> {
  const env = getServerEnv();
  const base = env.R2_PUBLIC_URL.replace(/\/+$/, "");
  if (!publicUrl.startsWith(`${base}/`)) return;
  const key = publicUrl.slice(base.length + 1);
  if (!key) return;

  await getClient().send(
    new DeleteObjectCommand({
      Bucket: env.R2_BUCKET_NAME,
      Key: key,
    })
  );
}

interface PresignInspirationUploadInput {
  userId: string;
  contentType: InspirationContentType;
  contentLength: number;
}

export interface PresignInspirationUploadResult {
  uploadUrl: string;
  key: string;
  expiresIn: number;
  publicUrl: string;
}

export async function presignInspirationImageUpload(
  input: PresignInspirationUploadInput
): Promise<PresignInspirationUploadResult> {
  if (input.contentLength <= 0) {
    throw new InspirationUploadError(
      "Empty upload",
      "INSPIRATION_UPLOAD_INVALID_SIZE"
    );
  }
  if (input.contentLength > INSPIRATION_UPLOAD.maxBytes) {
    throw new InspirationUploadError(
      `Image too large. Max ${INSPIRATION_UPLOAD.maxMb}MB.`,
      "INSPIRATION_UPLOAD_TOO_LARGE"
    );
  }
  if (!INSPIRATION_UPLOAD.allowedContentTypes.includes(input.contentType)) {
    throw new InspirationUploadError(
      "Unsupported image type. Use PNG, JPEG, or WebP.",
      "INSPIRATION_UPLOAD_BAD_TYPE"
    );
  }

  const env = getServerEnv();
  const extension = INSPIRATION_UPLOAD.extensionByType[input.contentType];
  const objectName = `${nanoid(INSPIRATION_UPLOAD.idLength)}.${extension}`;
  const pathname = `${INSPIRATION_UPLOAD.pathPrefix}/${input.userId}/${objectName}`;
  const key = buildKey(env.R2_KEY_PREFIX, pathname);

  const command = new PutObjectCommand({
    Bucket: env.R2_BUCKET_NAME,
    Key: key,
    ContentType: input.contentType,
    ContentLength: input.contentLength,
    CacheControl: "private, max-age=86400",
  });
  const uploadUrl = await getSignedUrl(getClient(), command, {
    expiresIn: INSPIRATION_UPLOAD.presignExpiresSeconds,
  });

  const base = env.R2_PUBLIC_URL.replace(/\/+$/, "");
  return {
    uploadUrl,
    key,
    expiresIn: INSPIRATION_UPLOAD.presignExpiresSeconds,
    publicUrl: `${base}/${key}`,
  };
}

export function buildPublicUrlForKey(key: string): string {
  const env = getServerEnv();
  const base = env.R2_PUBLIC_URL.replace(/\/+$/, "");
  return `${base}/${key.replace(/^\/+/, "")}`;
}

export class InspirationUploadError extends Error {
  code: string;
  constructor(message: string, code: string) {
    super(message);
    this.name = "InspirationUploadError";
    this.code = code;
  }
}
