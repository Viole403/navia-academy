import { AntDesign } from "@expo/vector-icons"
import { ActivityIndicator, Pressable, Text, View } from "react-native"
import { fonts } from "@/theme/typography"
import { useTheme } from "@/theme/ThemeProvider"

export function GoogleSignInButton({
  title,
  onPress,
  loading,
  disabled,
}: {
  title: string
  onPress: () => void
  loading?: boolean
  disabled?: boolean
}) {
  const { resolvedMode, paper } = useTheme()
  const dark = resolvedMode !== "light"
  const bg = dark ? "#131314" : "#FFFFFF"
  const border = dark ? "#8E918F" : "#747775"
  const fg = dark ? "#E3E3E3" : "#1F1F1F"
  const inactive = disabled || loading
  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={title}
      // A plain object, not the ({ pressed }) => … form. The function form left
      // this Pressable rendering its children with no style at all under the
      // bridgeless runtime — no border, no fill, and the row collapsed so the
      // label sat under the logo. Press feedback would need onPressIn/onPressOut.
      style={{
        height: 52,
        borderRadius: paper.radius.pill,
        borderWidth: 1,
        borderColor: border,
        backgroundColor: bg,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        paddingHorizontal: 16,
        opacity: inactive ? 0.6 : 1,
      }}
    >
      {loading ? (
        <ActivityIndicator color={fg} size="small" />
      ) : (
        // Fixed-size box: an unsized glyph lays out at its intrinsic width and
        // pushes the label out of the row.
        <View
          style={{
            width: 20,
            height: 20,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <AntDesign name="google" size={20} color="#4285F4" />
        </View>
      )}
      <Text
        numberOfLines={1}
        style={{
          fontFamily: fonts.sans,
          fontSize: 16,
          fontWeight: "600",
          color: fg,
          flexShrink: 1,
        }}
      >
        {title}
      </Text>
    </Pressable>
  )
}
