import { useState } from "react"
import { Image } from "expo-image"
import { View } from "react-native"
import { useTheme } from "@/theme/ThemeProvider"
import { resolveMediaUrl } from "@/utils/env"

interface MediaImageProps {
  /**
   * Either an absolute URL (https://r2.dev/...) or a path relative to
   * `EXPO_PUBLIC_MEDIA_BASE_URL` — both are resolved automatically.
   */
  src: string | null | undefined
  /** Width/height. Defaults to full-width, square. */
  width?: number
  height?: number
  /** Border radius — keep small for editorial style. Default 4. */
  radius?: number
  style?: object
}

/**
 * Editorial image renderer for S3/R2-hosted media using expo-image.
 * - Disk-cached via expo-image's managed disk cache
 * - Graceful error fallback (broken-icon glyph)
 */
export function MediaImage({
  src,
  width,
  height,
  radius = 4,
  style,
}: MediaImageProps) {
  const { theme } = useTheme()
  const [errored, setErrored] = useState(false)

  const uri = resolveMediaUrl(src)
  const w = width ?? 96
  const h = height ?? 96

  const border = {
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: radius,
    backgroundColor: theme.surface,
  }

  if (!uri || errored) {
    return (
      <View
        style={[
          {
            width: w,
            height: h,
            alignItems: "center",
            justifyContent: "center",
          },
          border,
          style as object,
        ]}
      >
        <View
          style={{
            width: 16,
            height: 16,
            borderWidth: 1.5,
            borderColor: theme.border,
            borderRadius: 2,
          }}
        />
      </View>
    )
  }

  return (
    <View
      style={[
        { width: w, height: h, overflow: "hidden" },
        border,
        style as object,
      ]}
    >
      <Image
        source={{ uri }}
        style={{ width: w, height: h }}
        contentFit="cover"
        transition={150}
        onError={() => setErrored(true)}
      />
    </View>
  )
}
