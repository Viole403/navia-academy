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
  const { resolvedMode } = useTheme()
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
      style={({ pressed }) => ({
        height: 52,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: border,
        backgroundColor: bg,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        paddingHorizontal: 16,
        opacity: inactive ? 0.6 : pressed ? 0.85 : 1,
      })}
    >
      {loading ? (
        <ActivityIndicator color={fg} size="small" />
      ) : dark ? (
        <View
          style={{
            backgroundColor: "#FFFFFF",
            borderRadius: 2,
            padding: 3,
          }}
        >
          <AntDesign name="google" size={18} color="#4285F4" />
        </View>
      ) : (
        <AntDesign name="google" size={20} color="#4285F4" />
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
