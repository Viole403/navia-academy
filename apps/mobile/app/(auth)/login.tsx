import { useState } from "react"
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native"
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context"
import { useRouter } from "expo-router"
import { useMutation } from "@tanstack/react-query"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Motif } from "@/components/ui/Motif"
import { useTheme } from "@/theme/ThemeProvider"
import { fonts, type } from "@/theme/typography"
import { auth } from "@/api/endpoints"
import { useAuthStore } from "@/store/auth"
import { useOnboardingStore } from "@/store/onboarding"
import { motifChar } from "@/lib/languages"
import { saveTokens } from "@/utils/secure"

export default function Login() {
  const { theme } = useTheme()
  const router = useRouter()
  const setAuth = useAuthStore((s) => s.setAuth)
  const language = useOnboardingStore((s) => s.language)
  const insets = useSafeAreaInsets()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)

  const login = useMutation({
    mutationFn: () => auth.login(email.trim().toLowerCase(), password),
    onSuccess: async (data) => {
      await saveTokens({
        accessToken: data.token_pair.access_token,
        refreshToken: data.token_pair.refresh_token,
      })
      setAuth(
        data.user,
        data.token_pair.access_token,
        data.token_pair.refresh_token
      )
      router.replace("/(tabs)")
    },
    onError: (e: unknown) => {
      const msg = (
        e as { response?: { data?: { error?: { message?: string } } } }
      )?.response?.data?.error?.message
      setError(msg ?? "Sign in failed. Check your credentials.")
    },
  })

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, padding: 32, gap: 32 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={{ gap: 16, marginTop: 24 }}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "flex-start",
              }}
            >
              <View style={{ flex: 1, gap: 8 }}>
                <Text style={[type.labelSm, { color: theme.textMuted }]}>
                  Welcome back
                </Text>
                <Text
                  style={[type.display, { color: theme.text, fontSize: 36 }]}
                >
                  Sign in
                </Text>
                <Text style={[type.bodySm, { color: theme.textMuted }]}>
                  Continue where you left off.
                </Text>
              </View>
              <Motif char={motifChar(language)} size={64} />
            </View>

            <View style={{ height: 1, backgroundColor: theme.border }} />
          </View>

          {/* Form */}
          <View style={{ gap: 24 }}>
            <Input
              label="Email"
              placeholder="you@example.com"
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              value={email}
              onChangeText={setEmail}
            />
            <Input
              label="Password"
              placeholder="Your password"
              secureTextEntry
              autoComplete="current-password"
              value={password}
              onChangeText={setPassword}
            />
            <Pressable
              onPress={() => router.push("/(auth)/forgot")}
              hitSlop={8}
              style={{ alignItems: "flex-end", paddingVertical: 4 }}
            >
              <Text
                style={{
                  fontFamily: fonts.sans,
                  fontSize: 14,
                  color: theme.accent,
                  fontWeight: "600",
                }}
              >
                Forgot password?
              </Text>
            </Pressable>
            {error && (
              <Text style={{ color: theme.red, fontSize: 13 }}>{error}</Text>
            )}
          </View>

          {/* CTA — pinned footer with safe-area clearance */}
          <View
            style={{
              marginTop: "auto",
              gap: 4,
              paddingTop: 16,
              paddingBottom: Math.max(insets.bottom, 8),
              borderTopWidth: 1,
              borderTopColor: theme.border,
            }}
          >
            <Button
              title="Sign in"
              onPress={() => login.mutate()}
              loading={login.isPending}
              disabled={!email || !password}
              size="lg"
            />
            <Pressable
              onPress={() => router.replace("/(auth)/register")}
              hitSlop={8}
              style={{ alignItems: "center", paddingVertical: 12 }}
            >
              <Text
                style={{
                  fontFamily: fonts.sans,
                  fontSize: 15,
                  color: theme.textMuted,
                }}
              >
                New here?{" "}
                <Text style={{ color: theme.accent, fontWeight: "600" }}>
                  Create an account
                </Text>
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
