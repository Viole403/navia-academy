import { useEffect } from "react"
import { Redirect } from "expo-router"
import { Text, View, ActivityIndicator } from "react-native"
import { useAuthStore } from "@/store/auth"
import { useAppStore } from "@/store/app"
import { useOnboardingStore } from "@/store/onboarding"
import { Enter } from "@/components/ui/Enter"
import { Motif } from "@/components/ui/Motif"
import { motifChar } from "@/lib/languages"
import { useTheme } from "@/theme/ThemeProvider"
import { type } from "@/theme/typography"

export default function Index() {
  const { user, hydrated } = useAuthStore()
  const { hasOnboarded } = useAppStore()
  const language = useOnboardingStore((s) => s.language)
  const { theme, paper } = useTheme()

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
        <Enter index={1}>
          <View style={{ alignItems: "center", gap: 16 }}>
            <Text style={[type.labelSm, { color: theme.textMuted }]}>
              Navia Academy
            </Text>
            <ActivityIndicator color={theme.accent} size="small" />
          </View>
        </Enter>
      </View>
    )
  }

  if (!hasOnboarded) return <Redirect href="/(onboarding)" />
  if (!user) return <Redirect href="/(auth)" />
  return <Redirect href="/(tabs)" />
}
