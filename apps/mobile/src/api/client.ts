import axios, {
  AxiosError,
  AxiosInstance,
  InternalAxiosRequestConfig,
} from "axios"
import { useAuthStore } from "@/store/auth"
import { clearTokens, getTokens, saveTokens } from "@/utils/secure"
import { env } from "@/utils/env"
import type { LoginResponse } from "@/types/api"

/** Listeners are called synchronously when refresh fails. */
type RefreshFailListener = () => void
const refreshFailListeners = new Set<RefreshFailListener>()

/** Register a listener for when the refresh token expires. */
export function onRefreshFail(fn: RefreshFailListener): () => void {
  refreshFailListeners.add(fn)
  return () => refreshFailListeners.delete(fn)
}

export const apiClient: AxiosInstance = axios.create({
  baseURL: env.apiUrl,
  timeout: 20000,
  headers: { "Content-Type": "application/json" },
})

// ─── Request: attach access token + log in debug mode ─────────────────────
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const token = useAuthStore.getState().accessToken
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    if (env.apiDebug) {
      console.log(
        `[api] → ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`,
        config.data ?? ""
      )
    }
    return config
  }
)

// ─── Response: auto-refresh on 401 + log in debug mode ───────────────────
let refreshing: Promise<string | null> | null = null

async function doRefresh(): Promise<string | null> {
  const state = useAuthStore.getState()
  const stored = await getTokens()
  const refreshToken = state.refreshToken ?? stored?.refreshToken
  if (!refreshToken) return null

  try {
    const res = await axios.post<LoginResponse>(`${env.apiUrl}/auth/refresh`, {
      refresh_token: refreshToken,
    })
    const { user, session } = res.data
    state.setAuth(user, session.access_token, session.refresh_token)
    await saveTokens({
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
    })
    return session.access_token
  } catch {
    state.signOut()
    await clearTokens()
    refreshFailListeners.forEach((fn) => fn())
    return null
  }
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as
      (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined

    if (env.apiDebug && error.response) {
      console.log(
        `[api] ← ${error.response.status} ${original?.method?.toUpperCase()} ${original?.url}`
      )
    }

    if (error.response?.status === 401 && original && !original._retried) {
      original._retried = true
      refreshing ??= doRefresh()
      const newToken = await refreshing
      refreshing = null
      if (newToken && original.headers) {
        original.headers.Authorization = `Bearer ${newToken}`
        return apiClient(original)
      }
    }
    return Promise.reject(error)
  }
)

export default apiClient
