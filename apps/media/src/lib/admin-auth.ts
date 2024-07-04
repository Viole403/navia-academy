/**
 * Shared-secret auth for the Media Studio dashboard.
 *
 * The whole dashboard (pages + API routes) is gated by a single secret,
 * `MEDIA_ADMIN_TOKEN`. When it is not set (local dev without a configured
 * secret) the dashboard stays open for convenience; once set, every request
 * must carry a session cookie issued by `POST /api/auth/login`.
 *
 * The cookie value IS the token itself (httpOnly). Compared in constant time
 * in proxy — no JWT/session store needed for an internal admin tool.
 */

export const ADMIN_COOKIE = "media_admin_session";

export function adminAuthEnabled(): boolean {
  return Boolean(process.env.MEDIA_ADMIN_TOKEN);
}

/** Constant-time string comparison to avoid timing side channels. */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
