import { Redirect, Tabs } from "expo-router";
import { Text } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { fonts } from "@/theme/typography";
import { useAuthStore } from "@/store/auth";

const TAB_ICONS: Record<string, string> = {
  index: "卷", // scroll / book
  learn: "学", // learn
  exam: "考", // exam
  stats: "图", // chart
  profile: "我", // me
};

export default function TabsLayout() {
  const { theme } = useTheme();
  const user = useAuthStore((s) => s.user);

  if (!user) return <Redirect href="/(auth)" />;

  return (
    <Tabs
      screenOptions={({ route }) => ({
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
        tabBarIcon: ({ focused, color }) => (
          <Text
            style={{
              fontFamily: fonts.serif,
              fontSize: 22,
              color,
              opacity: focused ? 1 : 0.7,
            }}
          >
            {TAB_ICONS[route.name] ?? "·"}
          </Text>
        ),
      })}
    >
      <Tabs.Screen name="index" options={{ title: "Today" }} />
      <Tabs.Screen name="learn" options={{ title: "Learn" }} />
      <Tabs.Screen name="exam" options={{ title: "Exam" }} />
      <Tabs.Screen name="stats" options={{ title: "Stats" }} />
      <Tabs.Screen name="profile" options={{ title: "Me" }} />
    </Tabs>
  );
}
