import sharp from "sharp";

export interface CompressedImage {
  buf: Buffer;
  ext: string;
  mime: string;
}

/**
 * Downscale + re-encode any generated image to WebP 512 (displayed at ~192px
 * in the web exam UI). Returns null when the input cannot be decoded — caller
 * keeps the raw buffer + detected format instead of failing the batch.
 */
export async function compressImage(buf: Buffer): Promise<CompressedImage | null> {
  try {
    const out = await sharp(buf).rotate().resize(512, 512, { fit: "inside" }).webp({ quality: 80 }).toBuffer();
    return { buf: out, ext: "webp", mime: "image/webp" };
  } catch {
    return null;
  }
}
