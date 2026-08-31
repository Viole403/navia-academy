import { Text, View } from "react-native"
import { useTheme } from "@/theme/ThemeProvider"
import { fonts } from "@/theme/typography"

/**
 * Editorial motif — a single akzent element placed beside key content.
 * Resembles a Chinese chop seal: a small framed square with one Hanzi.
 */
export function Motif({
  char = "章",
  size = 56,
}: {
  char?: string
  size?: number
}) {
  const { theme } = useTheme()

  return (
    <View
      style={{
        width: size,
        height: size,
        borderWidth: 1.5,
        borderColor: theme.accent,
        backgroundColor: theme.accent + "08",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 2,
        transform: [{ rotate: "-4deg" }],
      }}
    >
      <Text
        style={{
          fontFamily: fonts.serif,
          fontSize: size * 0.5,
          color: theme.accent,
          fontWeight: "500",
        }}
      >
        {char}
      </Text>
    </View>
  )
}
