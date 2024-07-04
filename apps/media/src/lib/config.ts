/**
 * Centralized media pipeline configuration.
 *
 * Storage targets (S3-compatible — works with local RustFS, Cloudflare R2,
 * Google Cloud Storage, AWS S3, MinIO, DigitalOcean Spaces, …):
 *   MEDIA_STORAGE_PROVIDER=s3|r2|gcs
 *   MEDIA_STORAGE_BUCKET=navia-data
 *   MEDIA_STORAGE_ENDPOINT=http://localhost:9000   (RustFS dev / MinIO)
 *   MEDIA_STORAGE_REGION=us-east-1                 (R2: auto)
 *   MEDIA_STORAGE_ACCESS_KEY=...
 *   MEDIA_STORAGE_SECRET_KEY=...
 *   MEDIA_STORAGE_PUBLIC_URL=http://localhost:9000/navia-data
 *
 * Audio: MEDIA_TTS_ENGINE=edge|google|azure
 * Images: MEDIA_IMAGE_PROVIDER=openai|gemini|deepai|cloudflare (dev aktif: cloudflare)
 */

import { existsSync } from "node:fs";
import { readMediaSettings } from "./settings";

// CLI scripts load `apps/media/.env.local` (ignored on Vercel where env is injected).
if (existsSync(".env.local")) {
  try {
    process.loadEnvFile(".env.local");
  } catch {
    // ignore
  }
}

export interface MediaConfig {
  storageProvider: "s3" | "r2" | "gcs";
  bucket: string;
  region: string;
  endpoint: string;
  accessKey: string;
  secretKey: string;
  publicUrl: string;

  audioPrefix: string;
  imagePrefix: string;

  ttsEngine: "edge" | "google" | "azure";
  ttsRate: string;

  imageProvider: "openai" | "gemini" | "deepai" | "cloudflare";
  imageApiKey: string;
  imageApiBaseUrl: string;
  imageModel: string;
  imageDeepaiModel: string;
  imageDeepaiPaidKey: string;
  imageCfAccountId: string;
  imageCfApiToken: string;
  imageCfModel: string;
  imageRateLimitMs: number;
}

function env(key: string, fallback = ""): string {
  return process.env[key] ?? fallback;
}

export function loadMediaConfig(): MediaConfig {
  return {
    storageProvider: (env("MEDIA_STORAGE_PROVIDER", "s3") as MediaConfig["storageProvider"]),
    bucket: env("MEDIA_STORAGE_BUCKET", "navia-data"),
    region: env("MEDIA_STORAGE_REGION", "us-east-1"),
    endpoint: env("MEDIA_STORAGE_ENDPOINT"),
    accessKey: env("MEDIA_STORAGE_ACCESS_KEY"),
    secretKey: env("MEDIA_STORAGE_SECRET_KEY"),
    publicUrl: env("MEDIA_STORAGE_PUBLIC_URL"),

    audioPrefix: "audio/",
    imagePrefix: "images/",

    ttsEngine: (env("MEDIA_TTS_ENGINE", "edge") as MediaConfig["ttsEngine"]),
    ttsRate: env("MEDIA_TTS_RATE", "+0%"),

    imageProvider: (env("MEDIA_IMAGE_PROVIDER", "openai") as MediaConfig["imageProvider"]),
    imageApiKey: env("MEDIA_IMAGE_API_KEY"),
    imageApiBaseUrl: env("MEDIA_IMAGE_API_BASE_URL", "https://api.openai.com/v1"),
    imageModel: env("MEDIA_IMAGE_MODEL", "gpt-image-1"),
    imageDeepaiModel: env("MEDIA_IMAGE_DEEPAI_MODEL", "3d-cartoon-generator"),
    imageDeepaiPaidKey: env("MEDIA_IMAGE_DEEPAI_PAID_KEY"),
    imageCfAccountId: env("MEDIA_IMAGE_CF_ACCOUNT_ID"),
    imageCfApiToken: env("MEDIA_IMAGE_CF_API_TOKEN"),
    imageCfModel: env("MEDIA_IMAGE_CF_MODEL", "@cf/black-forest-labs/flux-1-schnell"),
    imageRateLimitMs: Number(env("MEDIA_IMAGE_RATE_LIMIT_MS", "1000")),
  };
}

export function storageConfigured(cfg: MediaConfig): boolean {
  return Boolean(cfg.accessKey && cfg.secretKey && cfg.bucket);
}

/**
 * Resolve the effective pipeline config. Precedence for provider/engine:
 *   explicit env var  >  `media_settings` DB override  >  built-in default.
 * Runs are therefore controllable from the Media Studio dashboard while an
 * explicit env (e.g. a GitHub Actions secret) still wins when set.
 */
export async function resolveMediaConfig(): Promise<MediaConfig> {
  const cfg = loadMediaConfig();
  try {
    const overrides = await readMediaSettings();
    const imageProvider = env("MEDIA_IMAGE_PROVIDER") || overrides.imageProvider || cfg.imageProvider;
    const ttsEngine = env("MEDIA_TTS_ENGINE") || overrides.ttsEngine || cfg.ttsEngine;
    return {
      ...cfg,
      imageProvider: imageProvider as MediaConfig["imageProvider"],
      ttsEngine: ttsEngine as MediaConfig["ttsEngine"],
    };
  } catch {
    return cfg;
  }
}
