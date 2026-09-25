import { useState } from "react"
import { Pressable, Text, View } from "react-native"
import { useRouter } from "expo-router"
import { useMutation } from "@tanstack/react-query"
import { AuthShell } from "@/components/auth/AuthShell"
import { Input } from "@/components/ui/Input"
import { PaperCard } from "@/components/study/PaperCard"
import { useTheme } from "@/theme/ThemeProvider"
import { type } from "@/theme/typography"
import { decorArt } from "@/components/study/art"
import { auth } from "@/api/endpoints"
import { useT } from "@/i18n"

/**
 * Password reset, in two steps on one screen.
 *
 * The two steps stay on one page because the token arrives in an email the
 * learner has open in another app, and making them navigate to a second screen
 * and back loses the email they are looking at on small devices. The action
 * button re-labels itself per step instead.
 */
export default function ForgotScreen() {
  const { theme } = useTheme()
  const router = useRouter()
  const t = useT()

  const [email, setEmail] = useState("")
  const [token, setToken] = useState("")
  const [next, setNext] = useState("")
  const [sent, setSent] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const requestM = useMutation({
    mutationFn: () => auth.requestReset(email.trim()),
    onSuccess: () => {
      setSent(true)
      setMsg(t("auth.tokenSent"))
    },
    onError: () => setMsg(t("auth.requestFailed")),
  })

  const confirmM = useMutation({
    mutationFn: () => auth.confirmReset(email.trim(), token.trim(), next),
    onSuccess: () => setMsg(t("auth.resetDone")),
    onError: () => setMsg(t("auth.badToken")),
  })

  const short = next.length > 0 && next.length < 8
  const canSubmit = sent
    ? token.trim().length > 0 && next.length >= 8
    : email.trim().length > 0

  return (
    <AuthShell
      kicker={t("auth.remembered")}
      title={t("auth.resetPassword")}
      subtitle={sent ? t("auth.resetStepTwo") : t("auth.resetStepOne")}
      art={decorArt.cloudDrift}
      artKey="cloudDrift"
      artHeight={110}
      action={sent ? t("auth.setNewPassword") : t("auth.sendToken")}
      busy={requestM.isPending || confirmM.isPending}
      disabled={!canSubmit}
      onAction={() => {
        setMsg(null)
        if (sent) confirmM.mutate()
        else requestM.mutate()
      }}
      footer={
        <Pressable onPress={() => router.replace("/(auth)/login")}>
          <Text style={[type.bodySm, { color: theme.accent }]}>
            {t("auth.backToSignIn")}
          </Text>
        </Pressable>
      }
    >
      <View style={{ gap: 18 }}>
        <Input
          label={t("auth.email")}
          value={email}
          onChangeText={(v) => {
            setEmail(v)
            setMsg(null)
          }}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          // The email is the lookup key for the token, so it stays editable
          // after the request — a wrong address is the most common reason the
          // second step fails.
          editable
        />

        {sent ? (
          <>
            <Input
              label={t("auth.resetToken")}
              value={token}
              onChangeText={(v) => {
                setToken(v)
                setMsg(null)
              }}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Input
              label={t("auth.newPassword")}
              value={next}
              onChangeText={(v) => {
                setNext(v)
                setMsg(null)
              }}
              secureTextEntry
              autoComplete="new-password"
              textContentType="newPassword"
              hint={short ? t("auth.passwordTooShort") : t("auth.passwordHint")}
            />
          </>
        ) : null}

        {msg ? (
          <PaperCard tone="plain">
            <Text style={[type.bodySm, { color: theme.text, lineHeight: 20 }]}>
              {msg}
            </Text>
          </PaperCard>
        ) : null}
      </View>
    </AuthShell>
  )
}
