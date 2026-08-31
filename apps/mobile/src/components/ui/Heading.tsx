import { Text, View } from "react-native"
import { useTheme } from "@/theme/ThemeProvider"
import { fonts, type } from "@/theme/typography"

interface HeadingProps {
  title: string
  subtitle?: string
  /** Optional kicker label above the title — uppercase serif */
  kicker?: string
  /** Pull-quote style: hairline rule above and below */
  framed?: boolean
}

/**
 * Editorial heading — serif display type with optional caps kicker
 * and hairline rules above/below like a magazine feature opener.
 */
export function Heading({ title, subtitle, kicker, framed }: HeadingProps) {
  const { theme } = useTheme()

  return (
    <View style={{ gap: 12 }}>
      {framed && <View style={{ height: 1, backgroundColor: theme.border }} />}
      {kicker && (
        <Text
          style={[
            type.label,
            {
              color: theme.textMuted,
              fontFamily: fonts.sans,
            },
          ]}
        >
          {kicker}
        </Text>
      )}
      <Text
        style={[
          type.h1,
          {
            color: theme.text,
          },
        ]}
      >
        {title}
      </Text>
      {subtitle ? (
        <Text
          style={[
            type.body,
            {
              color: theme.textMuted,
            },
          ]}
        >
          {subtitle}
        </Text>
      ) : null}
      {framed && <View style={{ height: 1, backgroundColor: theme.border }} />}
    </View>
  )
}
