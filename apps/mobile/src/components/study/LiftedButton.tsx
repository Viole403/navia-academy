import { Text, View } from "react-native"
import { useTheme } from "@/theme/ThemeProvider"
import { fonts } from "@/theme/typography"
import { cardShadow, radii, spacing, studyType, shoulderFor } from "./tokens"
import { PressableScale } from "./PressableScale"

/**
 * Two-part button.
 * A "shoulder" (darker face colour) sits at top: LIFT with the face
 * translating down onto it on press, so it reads depressed, not dimmed.
 */
const LIFT = 4

export function LiftedButton({
  title,
  onPress,
  face,
  textColor,
  small,
  disabled,
}: {
  title: string
  onPress: () => void
  face?: string
  textColor?: string
  small?: boolean
  disabled?: boolean
}) {
  const { theme } = useTheme()
  const faceColor = face ?? theme.accent
  const fg = textColor ?? theme.white
  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      style={{ opacity: disabled ? 0.5 : 1 }}
    >
      <View style={{ paddingTop: LIFT }}>
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: (small ? 40 : 52) + LIFT,
            borderRadius: radii.pill,
            backgroundColor: shoulderFor(faceColor, theme),
          }}
        />
        <View
          style={{
            height: small ? 40 : 52,
            borderRadius: radii.pill,
            backgroundColor: faceColor,
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: spacing.xl,
            ...cardShadow(theme, true),
          }}
        >
          <Text
            style={[
              studyType.button,
              { color: fg, fontFamily: fonts.sans, fontWeight: "800" },
            ]}
          >
            {title}
          </Text>
        </View>
      </View>
    </PressableScale>
  )
}
