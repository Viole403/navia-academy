import { useEffect } from "react"
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

function AppShell() {
  const { theme, resolvedMode } = useTheme()
  const router = useRouter()

  return (
    <>
      <StatusBar style={resolvedMode === "light" ? "dark" : "light"} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.bg },
        }}
      />
    </>
  )
}

export default function RootLayout() {
  const { setAuth, setTokens, markHydrated } = useAuthStore()
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

    // Redirect to sign-in when refresh token is rejected by the server.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const unsubscribe = onRefreshFail(() => {
      router.replace("/(auth)/sign-in" as any)
    })

    return unsubscribe
  }, [setAuth, setTokens, markHydrated])

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <AppShell />
          </ThemeProvider>
        </QueryClientProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  )
}
