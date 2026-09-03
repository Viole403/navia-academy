import type { NextConfig } from "next"
import path from "path"

function originOf(raw: string | undefined, fallback: string): string {
  try {
    return new URL(raw && raw.trim() ? raw : fallback).origin
  } catch {
    return new URL(fallback).origin
  }
}

const apiOrigin = originOf(
  process.env.NEXT_PUBLIC_API_BASE_URL,
  "http://localhost:8080"
)
const dataOrigin = originOf(
  process.env.NEXT_PUBLIC_DATA_CDN_URL,
  "http://localhost:9000"
)
const audioOrigin = originOf(
  process.env.NEXT_PUBLIC_AUDIO_CDN_URL ??
    process.env.NEXT_PUBLIC_AUDIO_BASE_URL,
  "http://localhost:9000"
)
const imageOrigin = originOf(
  process.env.NEXT_PUBLIC_IMAGE_BASE_URL,
  "http://localhost:9000"
)

// Unique origins, stable order.
const contentOrigins = [...new Set([dataOrigin, audioOrigin, imageOrigin])]
const contentSrc = contentOrigins.join(" ")

const securityHeaders = [
  { key: "X-DNS-Prefetch-Control", value: "on" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'none'",
      "form-action 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      `img-src 'self' data: https: ${contentSrc}`,
      `connect-src 'self' ${apiOrigin} ${contentSrc}`,
      `media-src 'self' ${contentSrc}`,
      "font-src 'self'",
    ].join("; "),
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
]

function remotePattern(raw: string | undefined, fallback: string) {
  const u = new URL(raw && raw.trim() ? raw : fallback)
  return {
    protocol: u.protocol.replace(":", "") as "http" | "https",
    hostname: u.hostname,
    ...(u.port ? { port: u.port } : {}),
  }
}

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      remotePattern(
        process.env.NEXT_PUBLIC_IMAGE_BASE_URL,
        "http://localhost:9000"
      ),
    ],
  },
  turbopack: {
    root: path.resolve(process.cwd(), "../.."),
  },
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }]
  },
}

export default nextConfig
