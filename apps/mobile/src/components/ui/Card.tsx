import { PropsWithChildren } from "react";
import { View } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";

interface CardProps {
  padded?: boolean;
  /** Add a hairline top rule — editorial print style */
  rule?: boolean;
}

/**
 * Editorial card — flat surface with hairline border, no elevation.
 * Sharp corners (radius 4) differentiate from rounded bento apps.
 */
export function Card({
  children,
  padded = true,
  rule = false,
}: PropsWithChildren<CardProps>) {
  const { theme } = useTheme();

  return (
    <View
      style={{
        backgroundColor: theme.surface,
        borderWidth: 1,
        borderColor: theme.border,
        borderRadius: 4,
        padding: padded ? 20 : 0,
      }}
    >
      {rule && (
        <View
          style={{
            height: 1,
            backgroundColor: theme.border,
            marginHorizontal: -20,
            marginTop: -12,
            marginBottom: 12,
          }}
        />
      )}
      {children}
    </View>
  );
}
