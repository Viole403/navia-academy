import { useState } from "react"
import { Pressable, Text, View } from "react-native"
import { useRouter } from "expo-router"
import { useMutation } from "@tanstack/react-query"
import { AuthShell } from "@/components/auth/AuthShell"
import { GoogleSignInButton } from "@/components/ui/GoogleSignInButton"
import { Input } from "@/components/ui/Input"
import { useTheme } from "@/theme/ThemeProvider"
import { type } from "@/theme/typography"
import { decorArt } from "@/components/study/art"
import { auth } from "@/api/endpoints"
import { useGoogleAuth } from "@/hooks/useGoogleAuth"
import { useAuthStore } from "@/store/auth"
import { useT } from "@/i18n"
import { saveTokens } from "@/utils/secure"

export default function Register() {
  const { theme } = useTheme()
  const router = useRouter()
  const t = useT()
  const setAuth = useAuthStore((s) => s.setAuth)

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
      setError(msg ?? t("auth.registerFailed"))
    },
  })

  /**
   * The 8-character rule is stated *before* submission and live, rather than as
   * an error that appears after a round trip and a red field. A password rule the
   * user only learns by being rejected is a rule they cannot act on.
   */
  const short = password.length > 0 && password.length < 8
  const canSubmit =
    name.trim().length > 0 && email.trim().length > 0 && password.length >= 8

  return (
    <AuthShell
      kicker={t("auth.newHere")}
      title={t("auth.createAccount")}
      art={decorArt.cloudCluster}
      artKey="cloudCluster"
      artHeight={120}
      action={t("auth.createAccount")}
      busy={register.isPending}
      disabled={!canSubmit}
      onAction={() => {
        setError(null)
        register.mutate()
      }}
      footer={
        <View style={{ gap: 12, alignItems: "center" }}>
          <Pressable onPress={() => router.replace("/(auth)/login")}>
            <Text style={[type.bodySm, { color: theme.textMuted }]}>
              {t("auth.haveAccount")}{" "}
              <Text style={{ color: theme.accent, fontWeight: "700" }}>
                {t("auth.signIn")}
              </Text>
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
            disabled={!google.canPrompt}
          />
        </View>
      }
    >
      <View style={{ gap: 18 }}>
        <Input
          label={t("auth.name")}
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
          autoComplete="name"
          textContentType="name"
        />
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
          autoComplete="new-password"
          textContentType="newPassword"
          error={error ?? undefined}
          hint={short ? t("auth.passwordTooShort") : t("auth.passwordHint")}
        />
      </View>
    </AuthShell>
  )
}
