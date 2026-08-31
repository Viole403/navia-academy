import { useState } from "react"
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  View,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useRouter } from "expo-router"
import { useMutation } from "@tanstack/react-query"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Motif } from "@/components/ui/Motif"
import { useTheme } from "@/theme/ThemeProvider"
import { type } from "@/theme/typography"
import { auth } from "@/api/endpoints"
import { useAuthStore } from "@/store/auth"
import { saveTokens } from "@/utils/secure"

export default function Register() {
  const { theme } = useTheme()
  const router = useRouter()
  const setAuth = useAuthStore((s) => s.setAuth)

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)

  const register = useMutation({
    mutationFn: () =>
      auth.register({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
      }),
    onSuccess: async (data) => {
      await saveTokens({
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
      })
      setAuth(data.user, data.session.access_token, data.session.refresh_token)
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
              <Motif char="开" size={64} />
            </View>

            <View style={{ height: 1, backgroundColor: theme.border }} />
          </View>

          {/* Form */}
          <View style={{ gap: 24 }}>
            <Input
              label="Name"
              placeholder="Chen Wei"
              autoCapitalize="words"
              autoComplete="name"
              value={name}
              onChangeText={setName}
            />
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
          <View style={{ marginTop: "auto", gap: 12 }}>
            <Button
              title="Create account"
              onPress={() => register.mutate()}
              loading={register.isPending}
              disabled={!name || !email || password.length < 8}
              size="lg"
            />
            <Button
              title="Already have one? Sign in"
              variant="ghost"
              onPress={() => router.replace("/(auth)/login")}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
