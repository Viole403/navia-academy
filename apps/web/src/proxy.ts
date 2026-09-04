import { NextRequest, NextResponse } from "next/server"

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

// Unique origins, stable order — mirrors next.config.ts.
const contentSrc = [...new Set([dataOrigin, audioOrigin, imageOrigin])].join(
  " "
)

export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64")
  const isDev = process.env.NODE_ENV === "development"

  // React needs 'unsafe-eval' in dev for error-stack reconstruction.
  // Production needs neither it nor 'unsafe-inline': Next.js reads the
  // nonce from the CSP header during SSR and stamps it onto the scripts
  // and styles it renders, so a per-request nonce is sufficient.
  // style-src keeps 'unsafe-inline' (Tailwind + runtime-injected component
  // styles); scripts are the XSS vector and stay strict.
  const cspHeader = [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${
      isDev ? " 'unsafe-eval'" : ""
    }`,
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob: https: ${contentSrc}`,
    // hanzi-writer fetches stroke-coordinate data from jsdElivr CDN in dev.
    `connect-src 'self' ${apiOrigin} ${contentSrc}${
      isDev ? " https://cdn.jsdelivr.net" : ""
    }`,
    `media-src 'self' ${contentSrc}`,
    "font-src 'self'",
    ...(isDev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ")

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set("x-nonce", nonce)
  requestHeaders.set("Content-Security-Policy", cspHeader)

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })
  response.headers.set("Content-Security-Policy", cspHeader)
  response.headers.set("x-nonce", nonce)

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Prefetch requests and static assets carry no inline scripts and
     * don't need the per-request nonce header.
     */
    {
      source: "/((?!api|_next/static|_next/image|favicon.ico).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
}
