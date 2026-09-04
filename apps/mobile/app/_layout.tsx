import { useEffect } from "react"
import { addEventListener, getInitialURL } from "expo-linking"
import { Stack, useRouter } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { GestureHandlerRootView } from "react-native-gesture-handler"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ThemeProvider, useTheme } from "@/theme/ThemeProvider"
import { useAuthStore } from "@/store/auth"
import { getTokens } from "@/utils/secure"
import { auth } from "@/api/endpoints"
import { onRefreshFail } from "@/api/client"
import { ErrorBoundary } from "@/components/ui/ErrorBoundary"
import "../global.css"

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
})

/** Whitelist of allowed deep-link path prefixes (scheme: navia://).
 *  Guards against F-18: deep-link injection via arbitrary URL schemes. */
const ALLOWED_PREFIXES = ["/vocab/", "/review", "/exam", "/apply", "/profile"]

/** Returns true when the parsed path is in the allow-list. */
function isAllowedPath(path: string | null): boolean {
  return path != null && ALLOWED_PREFIXES.some((p) => path.startsWith(p))
}

/** Extract the path from a navia:// URL, null if malformed. */
function extractPath(url: string): string | null {
  const match = url.match(/^navia:\/\/([^?#]+)/)
  return match ? "/" + match[1] : null
}

const linking = {
  prefixes: ["navia://"],
  config: {
    screens: {
      "(auth)": {
        screens: {
          "sign-in": "sign-in",
        },
      },
      "(tabs)": {
        screens: {
          index: "",
          learn: "learn",
          profile: "profile",
        },
      },
      vocab: "vocab/:id",
      review: "review",
      exam: "exam",
      apply: "apply",
    },
  },
}

function AppShell() {
  const { theme, resolvedMode } = useTheme()

  return (
    <>
      <StatusBar style={resolvedMode === "light" ? "dark" : "light"} />
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <Stack
        {...({
          screenOptions: {
            headerShown: false,
            contentStyle: { backgroundColor: theme.bg },
          },
          linking: linking,
        } as any)}
      />
    </>
  )
}

export default function RootLayout() {
  const { setAuth, setTokens, markHydrated, signOut } = useAuthStore()
  const router = useRouter()

  useEffect(() => {
    ;(async () => {
      const tokens = await getTokens()
      if (tokens?.accessToken) {
        setTokens(tokens.accessToken, tokens.refreshToken)
        try {
          const me = await auth.me()
          setAuth(me, tokens.accessToken, tokens.refreshToken)
        } catch {
          // token invalid; refresh will be attempted by interceptor on next call
        }
      }
      markHydrated()
    })()
  }, [setAuth, setTokens, markHydrated])

  useEffect(() => {
    // Handle cold-start deep link (app was not in memory).
    ;(async () => {
      const url = await getInitialURL()
      if (url) {
        const path = extractPath(url)
        if (isAllowedPath(path)) {
          router.push(path as never)
        }
      }
    })()

    // Handle deep link when app is already running.
    const sub = addEventListener("url", ({ url }: { url: string }) => {
      const path = extractPath(url)
      if (isAllowedPath(path)) {
        router.push(path as never)
      }
    })

    return () => sub.remove()
  }, [router])

  useEffect(() => {
    // Redirect to sign-in when refresh token is rejected by the server.
    const unsubscribe = onRefreshFail(() => {
      signOut()
      router.replace("/(auth)/sign-in" as never)
    })
    return unsubscribe
  }, [signOut, router])
}
