import { PropsWithChildren } from "react"
import { ScrollView, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useTheme } from "@/theme/ThemeProvider"

interface ScreenProps {
  scroll?: boolean
  padded?: boolean
  /** Vertical gap between children */
  gap?: number
}

export function Screen({
  children,
  scroll = true,
  padded = true,
  gap = 20,
}: PropsWithChildren<ScreenProps>) {
  const { theme } = useTheme()

  const inner = (
    <View style={{ padding: padded ? 24 : 0, gap }}>{children}</View>
  )

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: theme.bg }}
      edges={["top", "bottom"]}
    >
      {scroll ? (
        <ScrollView
          contentContainerStyle={{ paddingBottom: 48, flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
        >
          {inner}
        </ScrollView>
      ) : (
        <View style={{ flex: 1 }}>{inner}</View>
      )}
    </SafeAreaView>
  )
}
