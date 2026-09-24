import { Pressable, Text, View } from "react-native"
import { useTheme } from "@/theme/ThemeProvider"
import { fonts, type } from "@/theme/typography"

interface ActionCardProps {
  glyph: string
  title: string
  description: string
  onPress: () => void
}

export function ActionCard({
  glyph,
  title,
  description,
  onPress,
}: ActionCardProps) {
  const { theme } = useTheme()
  return (
    <Pressable
      onPress={onPress}
      style={{
        padding: 18,
        borderWidth: 1,
        borderColor: theme.border,
        borderRadius: 4,
        backgroundColor: theme.surface,
        flexDirection: "row",
        alignItems: "center",
        gap: 16,
      }}
    >
      <Text
        style={{
          fontFamily: fonts.serif,
          fontSize: 40,
          color: theme.accent,
          fontWeight: "500",
        }}
      >
        {glyph}
      </Text>
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={[type.h3, { color: theme.text }]}>{title}</Text>
        <Text style={[type.bodySm, { color: theme.textMuted }]}>
          {description}
        </Text>
      </View>
      <Text
        style={{
          color: theme.textDim,
          fontFamily: fonts.serif,
          fontSize: 18,
        }}
      >
        →
      </Text>
    </Pressable>
  )
}
