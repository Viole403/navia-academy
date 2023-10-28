// Auth session manager. Auth lives on the Go/Fiber backend (custom JWT:
// access + refresh, HS256). This module stores the session locally and exposes
// helpers. All requests to the backend send `Authorization: Bearer <access_token>`.

import { API_BASE_URL } from "@/lib/api";

const SESSION_KEY = "navia-session";

export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  emailVerified: boolean;
  role: string;
  image?: string | null;
}

export interface AuthSession {
  access_token: string;
  refresh_token: string;
  expires_in?: number;
  user: AppUser;
}

type Listener = () => void;
const listeners = new Set<Listener>();

export function getStoredSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as AuthSession) : null;
  } catch {
    return null;
  }
}

function storeSession(session: AuthSession | null) {
  if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  else localStorage.removeItem(SESSION_KEY);
  listeners.forEach((l) => l());
}

export function getAccessToken(): string | null {
  return getStoredSession()?.access_token ?? null;
}

export function subscribeAuth(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

interface Envelope<T> {
  success: boolean;
  data?: T;
  error?: { code?: string; message?: string };
}

async function unwrap<T>(res: Response): Promise<T> {
  const json = (await res.json().catch(() => ({}))) as Envelope<T>;
  if (!res.ok || !json.success) {
    const msg =
      typeof json.error?.message === "string"
        ? json.error.message
        : `Request failed: ${res.status}`;
    const err = new Error(msg) as Error & { status?: number; code?: string };
    err.status = res.status;
    err.code = json.error?.code;
    throw err;
  }
  return json.data as T;
}

interface TokenPair {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

interface AuthUserRaw {
  id: string;
  name: string;
  email: string;
  email_verified: boolean;
  image?: string | null;
  role: string;
}

function toAppUser(u: AuthUserRaw): AppUser {
  return {
    uid: u.id,
    email: u.email ?? "",
    displayName: u.name || u.email || "User",
    emailVerified: !!u.email_verified,
    role: u.role || "student",
    image: u.image ?? null,
  };
}

function sessionFromAuth(data: { user: AuthUserRaw; token_pair: TokenPair }): AuthSession {
  return {
    access_token: data.token_pair.access_token,
    refresh_token: data.token_pair.refresh_token,
    expires_in: data.token_pair.expires_in,
    user: toAppUser(data.user),
  };
}

export async function signIn(email: string, password: string): Promise<void> {
  const data = await unwrap<{ user: AuthUserRaw; token_pair: TokenPair }>(
    await authRequest("/api/v1/auth/login", { email, password }),
  );
  storeSession(sessionFromAuth(data));
}

export async function signUp(name: string, email: string, password: string): Promise<void> {
  const data = await unwrap<{ user: AuthUserRaw; token_pair: TokenPair }>(
    await authRequest("/api/v1/auth/register", { name, email, password }),
  );
  storeSession(sessionFromAuth(data));
}

/**
 * Google OAuth (implicit flow). Fetches the authorize URL from the backend,
 * then redirects the browser there. The backend redirects back to
 * /auth/callback with the token in the URL fragment, handled there.
 */
export async function signInWithGoogle(): Promise<void> {
  const data = await unwrap<{ url: string }>(await fetch(`${API_BASE_URL}/api/v1/auth/google`, {
    method: "GET",
    headers: { Accept: "application/json" },
  }));
  if (!data?.url) throw new Error("Could not start Google sign-in.");
  window.location.href = data.url;
}

/** Build a session from the OAuth callback fragment (#access_token=…&refresh_token=…). */
export function sessionFromOAuthFragment(
  fragment: string,
  user: AppUser | null,
): AuthSession | null {
  const params = new URLSearchParams(fragment.replace(/^#/, ""));
  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");
  if (!accessToken || !refreshToken) return null;
  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_in: Number(params.get("expires_in") ?? 3600),
    user: user ?? { uid: "", email: null as unknown as string, displayName: "User", emailVerified: false, role: "student" },
  };
}

export async function signOut(): Promise<void> {
  const token = getAccessToken();
  if (token) {
    await fetch(`${API_BASE_URL}/api/v1/auth/logout`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {});
  }
  storeSession(null);
}

export async function refreshSession(): Promise<AuthSession | null> {
  const current = getStoredSession();
  if (!current?.refresh_token) return null;
  try {
    const pair = await unwrap<TokenPair>(
      await authRequest("/api/v1/auth/refresh", { refresh_token: current.refresh_token }),
    );
    if (!pair?.access_token) return null;
    const next: AuthSession = {
      access_token: pair.access_token,
      refresh_token: pair.refresh_token,
      expires_in: pair.expires_in,
      user: current.user,
    };
    storeSession(next);
    return next;
  } catch {
    return null;
  }
}

export async function requestPasswordReset(email: string): Promise<void> {
  await unwrap<{ ok: boolean }>(await authRequest("/api/v1/auth/reset-password", { email }));
}

async function authRequest(path: string, body: unknown): Promise<Response> {
  return fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export const authClient = { getSession: getStoredSession, signIn, signUp, signOut, refreshSession };
