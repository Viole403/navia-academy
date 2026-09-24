import { Redirect, Tabs } from "expo-router"
import { useTheme } from "@/theme/ThemeProvider"
import { fonts } from "@/theme/typography"
import { useAuthStore } from "@/store/auth"
import { useT } from "@/i18n"

export default function TabsLayout() {
  const { theme } = useTheme()
  const user = useAuthStore((s) => s.user)
  const t = useT()

  if (!user) return <Redirect href="/(auth)" />

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.accent,
        tabBarInactiveTintColor: theme.textDim,
        tabBarStyle: {
          backgroundColor: theme.bg,
          borderTopColor: theme.border,
          borderTopWidth: 1,
          elevation: 0,
          shadowOpacity: 0,
          height: 64,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontFamily: fonts.sans,
          fontSize: 10,
          fontWeight: "600",
          letterSpacing: 1.6,
          textTransform: "uppercase",
        },
      }}
    >
      <Tabs.Screen name="index" options={{ title: t("tabs.today") }} />
      <Tabs.Screen name="learn" options={{ title: t("tabs.learn") }} />
      <Tabs.Screen name="exam" options={{ title: t("tabs.exam") }} />
      <Tabs.Screen name="stats" options={{ title: t("tabs.stats") }} />
      <Tabs.Screen name="profile" options={{ title: t("tabs.me") }} />
    </Tabs>
  )
}
