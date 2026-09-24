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
import { useGoogleAuth } from "@/hooks/useGoogleAuth"
import { useAuthStore } from "@/store/auth"
import { useOnboardingStore } from "@/store/onboarding"
import { motifChar } from "@/lib/languages"
import { useT } from "@/i18n"
import { saveTokens } from "@/utils/secure"

export default function Register() {
  const { theme } = useTheme()
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const t = useT()
  const setAuth = useAuthStore((s) => s.setAuth)
  const language = useOnboardingStore((s) => s.language)

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const google = useGoogleAuth()

  const register = useMutation({
    mutationFn: () =>
      auth.register({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
      }),
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
      setError(msg ?? "Could not create account. Try again.")
    },
  })

  const passwordTooShort = password.length > 0 && password.length < 8

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
                  First time here
                </Text>
                <Text
                  style={[type.display, { color: theme.text, fontSize: 36 }]}
                >
                  Create account
                </Text>
                <Text style={[type.bodySm, { color: theme.textMuted }]}>
                  Your data syncs across devices.
                </Text>
              </View>
              <Motif char={motifChar(language)} size={64} />
            </View>

            <View style={{ height: 1, backgroundColor: theme.border }} />
          </View>

          {/* Form */}
          <View style={{ gap: 24 }}>
            <Input
              label={t("auth.name")}
              placeholder="Chen Wei"
              autoCapitalize="words"
              autoComplete="name"
              value={name}
              onChangeText={setName}
            />
            <Input
              label={t("auth.email")}
              placeholder="you@example.com"
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              value={email}
              onChangeText={setEmail}
            />
            <Input
              label={t("auth.password")}
              placeholder="8+ characters"
              secureTextEntry
              autoComplete="password-new"
              value={password}
              onChangeText={setPassword}
              error={
                passwordTooShort
                  ? "Password must be at least 8 characters"
                  : undefined
              }
            />
            {error && (
              <Text style={{ color: theme.red, fontSize: 13 }}>{error}</Text>
            )}
          </View>

          {/* CTA */}
          <View
            style={{
              marginTop: "auto",
              gap: 4,
              paddingTop: 16,
              paddingBottom: Math.max(insets.bottom, 8),
              borderTopWidth: 1,
              borderTopColor: theme.borderSoft,
            }}
          >
            <Button
              title={t("auth.createAccount")}
              onPress={() => register.mutate()}
              loading={register.isPending}
              disabled={!name || !email || password.length < 8}
              size="lg"
            />
            {google.configured && (
              <View style={{ gap: 4 }}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                    paddingVertical: 8,
                  }}
                >
                  <View
                    style={{
                      flex: 1,
                      height: 1,
                      backgroundColor: theme.border,
                    }}
                  />
                  <Text style={[type.caption, { color: theme.textMuted }]}>
                    {t("auth.or")}
                  </Text>
                  <View
                    style={{
                      flex: 1,
                      height: 1,
                      backgroundColor: theme.border,
                    }}
                  />
                </View>
                <Button
                  title={t("auth.google")}
                  variant="secondary"
                  onPress={google.prompt}
                  loading={google.pending}
                  disabled={!google.canPrompt}
                  size="lg"
                />
                {google.error && (
                  <Text style={{ color: theme.red, fontSize: 13 }}>
                    {google.error}
                  </Text>
                )}
              </View>
            )}
            <Pressable
              onPress={() => router.replace("/(auth)/login")}
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
                {t("auth.haveAccount")}{" "}
                <Text style={{ color: theme.accent, fontWeight: "600" }}>
                  {t("auth.signIn")}
                </Text>
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
