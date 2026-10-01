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
  return typeof v === "string" && v.length > 0 ? v : undefined
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

  /**
   * Google OAuth client IDs for native sign-in (expo-auth-session,
   * response_type=id_token, exchanged at POST /auth/google/exchange).
   * Empty = Google button hidden.
   */
  google: {
    android: str(process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID),
    ios: str(process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID),
    web: str(process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID),
  },
}

/**
 * Plain boolean, safe to read outside React.
 *
 * `Google.useAuthRequest` throws while rendering when the client id for the
 * current platform is `undefined`, so the hook must never be mounted in a build
 * without one. Screens gate on this flag instead of on the hook's own state.
 */
export const googleAuthConfigured = !!(
  env.google.android ||
  env.google.ios ||
  env.google.web
)

/**
 * Resolve a possibly-relative media URL against the configured base URL.
 * Absolute URLs (http/https/CDN) are returned as-is.
 */
export function resolveMediaUrl(url: string | null | undefined): string | null {
  if (!url) return null
  if (url.startsWith("http://") || url.startsWith("https://")) return url
  // Strip leading "/" so we don't end up with double slashes
  const path = url.startsWith("/") ? url.slice(1) : url
  return `${env.mediaBaseUrl.replace(/\/$/, "")}/${path}`
}
