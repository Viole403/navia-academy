import { useEffect } from "react"
import { View } from "react-native"
import { useFonts } from "expo-font"
import { addEventListener, getInitialURL } from "expo-linking"
import { Stack, useRouter } from "expo-router"
import { StatusBar } from "expo-status-bar"
import {
  SafeAreaProvider,
  initialWindowMetrics,
} from "react-native-safe-area-context"
import { GestureHandlerRootView } from "react-native-gesture-handler"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ThemeProvider, useTheme } from "@/theme/ThemeProvider"
import { useAuthStore } from "@/store/auth"
import { getTokens } from "@/utils/secure"
import { auth } from "@/api/endpoints"
import { onRefreshFail } from "@/api/client"
import { ErrorBoundary } from "@/components/ui/ErrorBoundary"
import { useOfflineDrain } from "@/hooks/useOfflineDrain"
import { useWidgetSync } from "@/hooks/useWidgetSync"
import { configureAudioSession, setSoundPrefs } from "@/utils/sound"
import { useSettingsPrefs } from "@/store/settings"
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
          login: "login",
          register: "register",
        },
      },
      "(tabs)": {
        screens: {
          index: "",
          learn: "learn",
          exam: "exam",
          stats: "stats",
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
  useOfflineDrain()
  // Keeps the five home-screen widgets in step with the data the app already
  // has; without this they render the empty default forever.
  useWidgetSync()
  const { theme, paper, resolvedMode } = useTheme()
  const soundEffects = useSettingsPrefs((s) => s.soundEffects)

  // One audio session for the whole app — see utils/sound.ts for why this has
  // to happen at startup rather than lazily on first effect.
  useEffect(() => {
    configureAudioSession().catch(() => {})
  }, [])
  useEffect(() => {
    setSoundPrefs({ enabled: soundEffects })
  }, [soundEffects])

  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <StatusBar style={resolvedMode === "light" ? "dark" : "light"} />
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <Stack
        {...({
          screenOptions: {
            headerShown: false,
            contentStyle: { backgroundColor: paper.paper },
          },
          linking: linking,
        } as any)}
      />
    </SafeAreaProvider>
  )
}

export default function RootLayout() {
  const { setAuth, setTokens, markHydrated, signOut } = useAuthStore()
  const router = useRouter()
  /*
   * One family per weight. React Native cannot synthesise weights the way a
   * browser can, so `fontWeight` on its own does nothing useful — a style must
   * name the family. This matters most for CJK, which has no synthesisable
   * bold at all.
   *
   * Noto Serif SC (this app's existing bundle) and the two faces added for the
   * paper design system: Noto Serif TC for a traditional-script reader (SC and
   * TC draw many shared codepoints differently) and Noto Sans TC for the writing
   * guide, whose Chinese sits beside sans-serif UI type.
   */
  const [fontsLoaded] = useFonts({
    NaviaSerifSC: require("../assets/fonts/NotoSerifSC.ttf"),
    NotoSerifTC: require("../assets/fonts/NotoSerifTC_500Medium.ttf"),
    NotoSansTC: require("../assets/fonts/NotoSansTC_500Medium.ttf"),
    Nunito_400Regular: require("@expo-google-fonts/nunito/400Regular/Nunito_400Regular.ttf"),
    Nunito_600SemiBold: require("@expo-google-fonts/nunito/600SemiBold/Nunito_600SemiBold.ttf"),
    Nunito_700Bold: require("@expo-google-fonts/nunito/700Bold/Nunito_700Bold.ttf"),
    Nunito_800ExtraBold: require("@expo-google-fonts/nunito/800ExtraBold/Nunito_800ExtraBold.ttf"),
    Inter_400Regular: require("@expo-google-fonts/inter/400Regular/Inter_400Regular.ttf"),
    Inter_500Medium: require("@expo-google-fonts/inter/500Medium/Inter_500Medium.ttf"),
    Inter_600SemiBold: require("@expo-google-fonts/inter/600SemiBold/Inter_600SemiBold.ttf"),
    Lora_400Regular: require("@expo-google-fonts/lora/400Regular/Lora_400Regular.ttf"),
    Lora_500Medium: require("@expo-google-fonts/lora/500Medium/Lora_500Medium.ttf"),
    Caveat_400Regular: require("@expo-google-fonts/caveat/400Regular/Caveat_400Regular.ttf"),
    Kalam_700Bold: require("@expo-google-fonts/kalam/700Bold/Kalam_700Bold.ttf"),
  })

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
      router.replace("/(auth)" as never)
    })
    return unsubscribe
  }, [signOut, router])

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <ErrorBoundary>
            {fontsLoaded ? (
              <AppShell />
            ) : (
              <View style={{ flex: 1, backgroundColor: "#141210" }} />
            )}
          </ErrorBoundary>
        </ThemeProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  )
}
