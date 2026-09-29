import { Pressable, Text, View } from "react-native"
import { useTheme } from "@/theme/ThemeProvider"

interface SegmentedControlProps<T extends string> {
  options: { id: T; label: string }[]
  value: T
  onChange: (id: T) => void
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  const { paper } = useTheme()
  return (
    <View style={{ flexDirection: "row", gap: 6 }}>
      {options.map((o) => {
        const sel = value === o.id
        return (
          <Pressable
            key={o.id}
            onPress={() => onChange(o.id)}
            style={{
              flex: 1,
              paddingVertical: 10,
              borderRadius: paper.radius.pill,
              borderWidth: 1.5,
              borderColor: sel ? paper.coral : paper.line,
              backgroundColor: sel ? paper.coralSoft : "transparent",
              alignItems: "center",
            }}
          >
            <Text
              style={{
                color: paper.ink,
                fontWeight: "600",
                fontSize: 13,
              }}
            >
              {o.label}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}
