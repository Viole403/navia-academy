import { Redirect, Tabs } from "expo-router"
import { Ionicons } from "@expo/vector-icons"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useTheme } from "@/theme/ThemeProvider"
import { fonts } from "@/theme/typography"
import { useAuthStore } from "@/store/auth"
import { useT } from "@/i18n"
import { TabBarButton } from "@/components/ui/TabBarButton"

export default function TabsLayout() {
  const { paper } = useTheme()
  const user = useAuthStore((s) => s.user)
  const t = useT()
  const insets = useSafeAreaInsets()

  if (!user) return <Redirect href="/(auth)" />

  // Reference trap (Dashboard docs): overriding tabBarStyle.height opts the
  // bar out of safe-area handling. Derive height + padding from the live
  // inset so the bar never slides under Android's gesture pill / 3-button
  // nav, which would then intercept the taps.
  const bottom = Math.max(insets.bottom, 12)

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        // Both of these are how the default button asks Android for a ripple.
        // This version has no tabBarPressColor/tabBarRippleColor, so the ripple
        // is removed at the button instead.
        // Cast because @react-navigation/bottom-tabs is a transitive dependency
        // of expo-router here, so its prop type is not resolvable from the app.
        tabBarButton: TabBarButton as never,
        // Raw theme.textDim is 2.4:1 on paper.paper — the faint grey the icons had.
        tabBarActiveTintColor: paper.coral,
        tabBarInactiveTintColor: paper.inkMuted,
        tabBarStyle: {
          backgroundColor: paper.paper,
          borderTopColor: paper.line,
          borderTopWidth: 1,
          elevation: 0,
          shadowOpacity: 0,
          height: 70 + bottom,
          paddingBottom: bottom,
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
      <Tabs.Screen
        name="index"
        options={{
          title: t("tabs.today"),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="learn"
        options={{
          title: t("tabs.learn"),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="book-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="exam"
        options={{
          title: t("tabs.exam"),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="trophy-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: t("tabs.stats"),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="bar-chart-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t("tabs.me"),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  )
}
