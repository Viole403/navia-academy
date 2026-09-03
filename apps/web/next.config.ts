import type { NextConfig } from "next"
import path from "path"

// NOTE: Content-Security-Policy is owned by src/proxy.ts, which mints a
// per-request nonce (strict script-src, Next.js stamps the nonce onto the
// scripts it renders). A static header here would intersect with it and
// defeat the nonce, so only the non-CSP hardening headers live here.
const securityHeaders = [
  { key: "X-DNS-Prefetch-Control", value: "on" },
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
