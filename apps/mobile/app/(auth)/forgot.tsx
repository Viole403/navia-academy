import { useState } from "react"
import { Pressable, Text, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useRouter } from "expo-router"
import { useMutation } from "@tanstack/react-query"
import { Button } from "@/components/ui/Button"
import { Enter } from "@/components/ui/Enter"
import { Input } from "@/components/ui/Input"
import { KeyboardSafeScroll } from "@/components/ui/KeyboardSafeScroll"
import { Motif } from "@/components/ui/Motif"
import { useTheme } from "@/theme/ThemeProvider"
import { fonts, type } from "@/theme/typography"
import { auth } from "@/api/endpoints"
import { motifChar } from "@/lib/languages"
import { useOnboardingStore } from "@/store/onboarding"

export default function ForgotScreen() {
  const { theme } = useTheme()
  const router = useRouter()
  const language = useOnboardingStore((s) => s.language)

  const [email, setEmail] = useState("")
  const [token, setToken] = useState("")
  const [next, setNext] = useState("")
  const [sent, setSent] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const requestM = useMutation({
    mutationFn: () => auth.requestReset(email.trim()),
    onSuccess: () => {
      setSent(true)
      setMsg("If the email exists, a reset token was sent.")
    },
    onError: () => setMsg("Request failed. Try again."),
  })

  const confirmM = useMutation({
    mutationFn: () => auth.confirmReset(email.trim(), token.trim(), next),
    onSuccess: () => {
      setMsg("Password reset. Sign in with the new password.")
    },
    onError: () => setMsg("Invalid or expired token."),
  })

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: theme.bg }}
      edges={["top"]}
    >
      <KeyboardSafeScroll
        contentContainerStyle={{ padding: 24, gap: 24, flexGrow: 1 }}
      >
        <Enter index={0}>
          <View style={{ gap: 12, alignItems: "flex-start" }}>
            <Motif char={motifChar(language)} size={56} />
            <Text style={[type.display, { color: theme.text, fontSize: 32 }]}>
              Reset password
            </Text>
            <Text style={[type.bodySm, { color: theme.textMuted }]}>
              {sent
                ? "Enter the token from your email plus a new password."
                : "Enter your account email to receive a reset token."}
            </Text>
          </View>
        </Enter>

        <Enter index={1}>
          <View style={{ gap: 16 }}>
            <Input
              label="Email"
              placeholder="you@example.com"
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              value={email}
              onChangeText={(v) => {
                setEmail(v)
                setMsg(null)
              }}
              editable={!sent}
            />
            {sent && (
              <>
                <Input
                  label="Reset token"
                  placeholder="Paste the token"
                  autoCapitalize="none"
                  value={token}
                  onChangeText={(v) => {
                    setToken(v)
                    setMsg(null)
                  }}
                />
                <Input
                  label="New password"
                  hint="At least 8 characters"
                  secureTextEntry
                  autoComplete="new-password"
                  value={next}
                  onChangeText={(v) => {
                    setNext(v)
                    setMsg(null)
                  }}
                />
              </>
            )}
            {!!msg && (
              <Text style={[type.bodySm, { color: theme.textMuted }]}>
                {msg}
              </Text>
            )}
          </View>
        </Enter>

        <View style={{ marginTop: "auto", gap: 4, paddingTop: 16 }}>
          {!sent ? (
            <Button
              title="Send reset token"
              onPress={() => requestM.mutate()}
              loading={requestM.isPending}
              disabled={!email}
              size="lg"
            />
          ) : (
            <Button
              title="Set new password"
              onPress={() => confirmM.mutate()}
              loading={confirmM.isPending}
              disabled={!token || next.length < 8}
              size="lg"
            />
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
              Remembered it?{" "}
              <Text style={{ color: theme.accent, fontWeight: "600" }}>
                Sign in
              </Text>
            </Text>
          </Pressable>
        </View>
      </KeyboardSafeScroll>
    </SafeAreaView>
  )
}
