import { useState } from "react"
import { ActivityIndicator, Image, ImageProps, View } from "react-native"
import { useTheme } from "@/theme/ThemeProvider"
import { resolveMediaUrl } from "@/utils/env"

interface MediaImageProps extends Omit<ImageProps, "source" | "src"> {
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
  /** Loading placeholder. Defaults to a hairline-bordered box. */
  placeholder?: React.ReactNode
}

/**
 * Editorial image renderer for S3/R2-hosted media.
 * - Resolves relative URLs against EXPO_PUBLIC_MEDIA_BASE_URL
 * - Hairline border, sharp 4px radius
 * - Graceful error fallback (broken-icon glyph)
 */
export function MediaImage({
  src,
  width,
  height,
  radius = 4,
  placeholder,
  style,
  ...rest
}: MediaImageProps) {
  const { theme } = useTheme()
  const [loading, setLoading] = useState(true)
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
          style,
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
    <View style={[{ width: w, height: h, overflow: "hidden" }, border, style]}>
      {loading &&
        (placeholder ?? (
          <View
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ActivityIndicator color={theme.accent} size="small" />
          </View>
        ))}
      <Image
        source={{ uri }}
        style={{ width: w, height: h }}
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
        onError={() => {
          setLoading(false)
          setErrored(true)
        }}
        {...rest}
      />
    </View>
  )
}
