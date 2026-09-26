import { useEffect } from "react"
import { Redirect } from "expo-router"
import { Text, View, ActivityIndicator } from "react-native"
import { useAuthStore } from "@/store/auth"
import { useAppStore } from "@/store/app"
import { useOnboardingStore } from "@/store/onboarding"
import { Motif } from "@/components/ui/Motif"
import { motifChar } from "@/lib/languages"
import { useTheme } from "@/theme/ThemeProvider"
import { paperType } from "@/theme/paperType"

/**
 * The gate every launch passes through: hydrate, then route.
 *
 * The three decisions are separate because they fail differently — a store that
 * has not read from disk yet is not a reason to send anyone to sign in, and a
 * learner with no account is not a reason to run onboarding. Collapsing them
 * into one `if (!user)` is what produces the flash of the sign-in screen for
 * someone who is already signed in, which is the first thing anyone sees and
 * the moment the app stops feeling like it remembers you.
 */
export default function Index() {
  const { user, hydrated } = useAuthStore()
  const { hasOnboarded } = useAppStore()
  const language = useOnboardingStore((s) => s.language)
  const { paper } = useTheme()

  if (!hydrated) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: paper.paper,
          alignItems: "center",
          justifyContent: "center",
          gap: 24,
        }}
      >
        <Motif char={motifChar(language)} size={96} />
        <View style={{ alignItems: "center", gap: 16 }}>
          <Text style={[paperType.label, { color: paper.inkMuted }]}>
            Navia Academy
          </Text>
          <ActivityIndicator color={paper.green} size="small" />
        </View>
      </View>
    )
  }

  if (!hasOnboarded) return <Redirect href="/(onboarding)" />
  if (!user) return <Redirect href="/(auth)" />
  return <Redirect href="/(tabs)" />
}
