import { Text, View } from "react-native";
import { colors } from "@/theme/colors";

interface HanziTileProps {
  char: string;
  size?: number;
}

export function HanziTile({ char, size = 64 }: HanziTileProps) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: 16,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ color: colors.text, fontSize: size * 0.5, fontWeight: "700" }}>
        {char}
      </Text>
    </View>
  );
}
