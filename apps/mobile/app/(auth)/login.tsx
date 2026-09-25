import { useState } from "react"
import { Pressable, Text, View } from "react-native"
import { useRouter } from "expo-router"
import { useMutation } from "@tanstack/react-query"
import { AuthShell } from "@/components/auth/AuthShell"
import { GoogleSignInButton } from "@/components/ui/GoogleSignInButton"
import { Input } from "@/components/ui/Input"
import { useTheme } from "@/theme/ThemeProvider"
import { type } from "@/theme/typography"
import { auth } from "@/api/endpoints"
import { useGoogleAuth } from "@/hooks/useGoogleAuth"
import { useAuthStore } from "@/store/auth"
import { useT } from "@/i18n"
import { saveTokens } from "@/utils/secure"
import { decorArt } from "@/components/study/art"

export default function Login() {
  const { theme } = useTheme()
  const router = useRouter()
  const t = useT()
  const setAuth = useAuthStore((s) => s.setAuth)

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const google = useGoogleAuth()

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
      setError(msg ?? t("auth.signInFailed"))
    },
  })

  const canSubmit = email.trim().length > 0 && password.length > 0

  return (
    <AuthShell
      kicker={t("auth.signIn")}
      title={t("auth.signIn")}
      art={decorArt.mountainsWide}
      artKey="mountainsWide"
      action={t("auth.signIn")}
      busy={login.isPending}
      disabled={!canSubmit}
      onAction={() => {
        setError(null)
        login.mutate()
      }}
      footer={
        <View style={{ gap: 12, alignItems: "center" }}>
          <Pressable onPress={() => router.push("/(auth)/forgot")}>
            <Text style={[type.bodySm, { color: theme.accent }]}>
              {t("auth.forgot")}
            </Text>
          </Pressable>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              alignSelf: "stretch",
            }}
          >
            <View
              style={{ flex: 1, height: 1, backgroundColor: theme.border }}
            />
            <Text style={[type.caption, { color: theme.textDim }]}>
              {t("auth.or")}
            </Text>
            <View
              style={{ flex: 1, height: 1, backgroundColor: theme.border }}
            />
          </View>
          <GoogleSignInButton
            title={t("auth.google")}
            onPress={google.prompt}
            loading={google.pending}
            // An unconfigured client must not offer a button that cannot work.
            disabled={!google.canPrompt}
          />
          <Pressable onPress={() => router.replace("/(auth)/register")}>
            <Text style={[type.bodySm, { color: theme.textMuted }]}>
              {t("auth.newHere")}{" "}
              <Text style={{ color: theme.accent, fontWeight: "700" }}>
                {t("auth.createAccount")}
              </Text>
            </Text>
          </Pressable>
        </View>
      }
    >
      <View style={{ gap: 18 }}>
        <Input
          label={t("auth.email")}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          textContentType="emailAddress"
        />
        <Input
          label={t("auth.password")}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="current-password"
          textContentType="password"
          error={error ?? undefined}
        />
      </View>
    </AuthShell>
  )
}
