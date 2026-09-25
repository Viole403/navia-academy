import { Stack } from "expo-router"
import { useTheme } from "@/theme/ThemeProvider"

export default function AuthLayout() {
  const { theme, paper } = useTheme()
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: paper.paper },
      }}
    />
  )
}
