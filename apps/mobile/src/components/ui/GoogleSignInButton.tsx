import { AntDesign } from "@expo/vector-icons"
import { ActivityIndicator, Pressable, Text } from "react-native"
import { fonts } from "@/theme/typography"

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
        borderColor: "#747775",
        backgroundColor: "#FFFFFF",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        paddingHorizontal: 16,
        opacity: inactive ? 0.6 : pressed ? 0.85 : 1,
      })}
    >
      {loading ? (
        <ActivityIndicator color="#1F1F1F" size="small" />
      ) : (
        <AntDesign name="google" size={20} color="#4285F4" />
      )}
      <Text
        style={{
          fontFamily: fonts.sans,
          fontSize: 16,
          fontWeight: "600",
          color: "#1F1F1F",
        }}
      >
        {title}
      </Text>
    </Pressable>
  )
}
