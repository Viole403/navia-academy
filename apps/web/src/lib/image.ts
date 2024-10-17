"use client";

import { loadBundle } from "@/lib/data-client";

/**
 * Image resolution for exam image-stimulus questions.
 *
 * Mirrors the audio-manifest pattern: media pipeline generates `images/<hash>.<ext>`
 * and publishes `images/manifest` to the data CDN (translation → hash/ext). Web
 * resolves a word's translation to its CDN URL via that manifest — no per-item
 * `image` field needed in content JSON.
 *
 * Env:
 *   NEXT_PUBLIC_IMAGE_BASE_URL — public base for the images bucket (default `/images`).
 */
type ImageManifestEntry = {
  hash: string;
  ext: string;
  translation: string;
  language?: string;
};

const BASE_URL = (process.env.NEXT_PUBLIC_IMAGE_BASE_URL ?? "/images").replace(/\/+$/, "");

let manifestPromise: Promise<Map<string, ImageManifestEntry>> | null = null;

function loadImageManifest(): Promise<Map<string, ImageManifestEntry>> {
  if (!manifestPromise) {
    manifestPromise = loadBundle<ImageManifestEntry[]>("images/manifest").then((entries) => {
      const map = new Map<string, ImageManifestEntry>();
      for (const entry of entries) {
        const key = entry.translation.toLowerCase().trim();
        if (!map.has(key)) map.set(key, entry);
      }
      return map;
    });
  }
  return manifestPromise;
}

/**
 * Resolve a word's translation to its generated image URL, or undefined if no
 * image exists for it (caller falls back to the placeholder).
 */
export async function imageUrl(translation?: string): Promise<string | undefined> {
  if (!translation) return undefined;
  const map = await loadImageManifest();
  const entry = map.get(translation.toLowerCase().trim());
  if (!entry) return undefined;
  return `${BASE_URL}/${entry.hash}.${entry.ext}`;
}

/** Whether any images exist at all for the current manifest. */
export async function imagesAvailable(): Promise<boolean> {
  const map = await loadImageManifest();
  return map.size > 0;
}