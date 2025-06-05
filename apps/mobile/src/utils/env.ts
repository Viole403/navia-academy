/**
 * Environment resolution:
 *
 * Priority order:
 *   1. `EXPO_PUBLIC_*` env vars (loaded by Expo CLI from .env or EAS build env)
 *   2. Safe defaults for local development (no app.json extra.* — removed)
 *
 * In EAS Build, values come from eas.json env via GitHub Actions secrets / vars.
 */

function str(v: unknown): string | undefined {
  return typeof v === "string" && v.length > 0 ? v : undefined;
}

export const env = {
  /** Backend base URL (Go/Fiber, self-hosted), e.g. "http://localhost:8080/api/v1" */
  apiUrl:
    str(process.env.EXPO_PUBLIC_API_URL) ?? "http://localhost:8080/api/v1",

  /**
   * Public S3/R2 URL prefix. The backend normally returns absolute URLs;
   * this is a fallback for any relative paths.
   */
  mediaBaseUrl:
    str(process.env.EXPO_PUBLIC_MEDIA_BASE_URL) ??
    "http://localhost:9000/navia-data",

  /** Verbose axios request/response logging in dev screens */
  apiDebug: process.env.EXPO_PUBLIC_API_DEBUG === "1",

  /** Expo release channel / runtime flavour */
  isDev: __DEV__,
};

/**
 * Resolve a possibly-relative media URL against the configured base URL.
 * Absolute URLs (http/https/CDN) are returned as-is.
 */
export function resolveMediaUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  // Strip leading "/" so we don't end up with double slashes
  const path = url.startsWith("/") ? url.slice(1) : url;
  return `${env.mediaBaseUrl.replace(/\/$/, "")}/${path}`;
}
