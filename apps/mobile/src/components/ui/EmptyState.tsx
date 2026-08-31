import { Text, View } from "react-native"
import { useTheme } from "@/theme/ThemeProvider"
import { fonts, type } from "@/theme/typography"

interface EmptyStateProps {
  title: string
  message?: string
  /** A single CJK character or glyph shown large like a printed dingbat */
  glyph?: string
}

export function EmptyState({ title, message, glyph }: EmptyStateProps) {
  const { theme } = useTheme()

  return (
    <View
      style={{
        alignItems: "center",
        paddingVertical: 48,
        paddingHorizontal: 24,
        gap: 12,
      }}
    >
      {glyph && (
        <Text
          style={{
            fontFamily: fonts.serif,
            fontSize: 56,
            color: theme.textDim,
            lineHeight: 64,
          }}
        >
          {glyph}
        </Text>
      )}
      <Text style={[type.h3, { color: theme.text, textAlign: "center" }]}>
        {title}
      </Text>
      {message ? (
        <Text
          style={[type.bodySm, { color: theme.textMuted, textAlign: "center" }]}
        >
          {message}
        </Text>
      ) : null}
    </View>
  )
}
