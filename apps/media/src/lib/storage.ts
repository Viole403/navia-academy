import {
  S3Client,
  PutObjectCommand,
  ListObjectsV2Command,
  DeleteObjectsCommand,
  HeadObjectCommand,
  type ObjectIdentifier,
} from "@aws-sdk/client-s3";
import type { MediaConfig } from "./config";

export interface UploadedObject {
  key: string;
  url: string;
}

/**
 * Thin S3-compatible client. The same endpoint abstraction covers local
 * RustFS (dev), Cloudflare R2, GCS interop, MinIO and AWS S3.
 */
export function createStorageClient(cfg: MediaConfig): S3Client {
  const opts: ConstructorParameters<typeof S3Client>[0] = {
    region: cfg.region,
    credentials: {
      accessKeyId: cfg.accessKey,
      secretAccessKey: cfg.secretKey,
    },
  };
  if (cfg.endpoint) {
    opts.endpoint = cfg.endpoint;
    opts.forcePathStyle = true;
  }
  return new S3Client(opts);
}

function publicUrlForKey(cfg: MediaConfig, key: string): string {
  if (cfg.publicUrl) {
    return `${cfg.publicUrl.replace(/\/+$/, "")}/${key}`;
  }
  return `https://${cfg.bucket}.s3.${cfg.region}.amazonaws.com/${key}`;
}

export async function uploadBuffer(
  cfg: MediaConfig,
  client: S3Client,
  key: string,
  data: Buffer,
  contentType: string,
  cacheControl = "public, max-age=31536000, immutable",
): Promise<UploadedObject> {
  await client.send(
    new PutObjectCommand({
      Bucket: cfg.bucket,
      Key: key,
      Body: data,
      ContentType: contentType,
      CacheControl: cacheControl,
    }),
  );
  return { key, url: publicUrlForKey(cfg, key) };
}

export async function listKeys(cfg: MediaConfig, client: S3Client, prefix: string): Promise<string[]> {
  const out: string[] = [];
  let token: string | undefined;
  do {
    const res = await client.send(
      new ListObjectsV2Command({ Bucket: cfg.bucket, Prefix: prefix, ContinuationToken: token }),
    );
    for (const o of res.Contents ?? []) {
      if (o.Key) out.push(o.Key);
    }
    token = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (token);
  return out;
}

/** True if the object already exists (HEAD). Used to skip re-uploads. */
export async function objectExists(cfg: MediaConfig, client: S3Client, key: string): Promise<boolean> {
  try {
    await client.send(new HeadObjectCommand({ Bucket: cfg.bucket, Key: key }));
    return true;
  } catch {
    return false;
  }
}

export async function deleteKeys(cfg: MediaConfig, client: S3Client, keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  const batch: ObjectIdentifier[] = keys.map((Key) => ({ Key }));
  await client.send(new DeleteObjectsCommand({ Bucket: cfg.bucket, Delete: { Objects: batch } }));
}
