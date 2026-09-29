import { Pressable, Text, View } from "react-native"
import { useT } from "@/i18n"
import type { Theme, ThemeDefinition, ThemeMode } from "@/theme/colors"
import { RADIUS } from "@/theme/paper"

export function ThemeSwatch({
  def,
  mode,
  selected,
  onPress,
}: {
  def: ThemeDefinition
  mode: ThemeMode
  selected: boolean
  onPress: () => void
}) {
  const t = useT()
  const showLight = mode === "light"
  const showAmoled = mode === "amoled"
  const base = showLight ? def.light : def.dark
  const preview: Theme = showAmoled
    ? { ...base, bg: "#000000", surface: "#0A0A0E", surfaceAlt: "#101016" }
    : base

  return (
    <Pressable
      onPress={onPress}
      style={{
        width: 96,
        height: 96,
        borderRadius: RADIUS.card,
        borderWidth: selected ? 2 : 1,
        borderColor: selected ? preview.accent : preview.border,
        backgroundColor: preview.bg,
        padding: 10,
        justifyContent: "space-between",
      }}
    >
      <View style={{ flexDirection: "row", gap: 4 }}>
        <View
          style={{
            width: 14,
            height: 14,
            borderRadius: 7,
            backgroundColor: preview.accent,
          }}
        />
        <View
          style={{
            width: 14,
            height: 14,
            borderRadius: 7,
            backgroundColor: preview.mint,
          }}
        />
      </View>
      <View>
        <Text
          style={{
            color: preview.text,
            fontSize: 11,
            fontWeight: "700",
            letterSpacing: 0.2,
          }}
          numberOfLines={1}
        >
          {def.name}
        </Text>
        <Text
          style={{ color: preview.textDim, fontSize: 9, marginTop: 1 }}
          numberOfLines={1}
        >
          {def.dynamic ? t("ob.sysPalette") : t("ob.editorial")}
        </Text>
      </View>
      {selected && (
        <View
          style={{
            position: "absolute",
            top: 6,
            right: 6,
            width: 14,
            height: 14,
            borderRadius: 7,
            backgroundColor: preview.accent,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text
            style={{ color: preview.white, fontSize: 9, fontWeight: "800" }}
          >
            ✓
          </Text>
        </View>
      )}
    </Pressable>
  )
}
