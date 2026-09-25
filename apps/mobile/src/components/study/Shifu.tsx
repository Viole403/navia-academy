import { Image, View } from "react-native"

/**
 * The mascot.
 *
 * One component with a `pose` prop, so a different render can replace the
 * current one by swapping the source with no page layout touched. `fill` lets
 * the mascot
 * flex into whatever height the header, card and footer leave, which needs
 * `minHeight: 0` on the flexed image and its wrapper, because a flex item
 * defaults to `min-height: auto` and an Image's content is its intrinsic pixel
 * height: without it `flex: 1` reclaims nothing and the page overflows by
 * exactly the amount the mascot should have given up.
 */
export type ShifuPose = "bow" | "wave" | "point" | "rest"

export function Shifu({
  pose = "bow",
  size = 120,
  fill,
  style,
}: {
  pose?: ShifuPose
  size?: number
  fill?: boolean
  style?: object
}) {
  return (
    <View
      style={
        fill
          ? {
              flex: 1,
              minHeight: 0,
              alignItems: "center",
              justifyContent: "flex-end",
              ...style,
            }
          : {
              width: size,
              height: size,
              alignItems: "center",
              justifyContent: "flex-end",
              ...style,
            }
      }
    >
      <Image
        source={require("@assets/study-art/images/mascot-shifu.png")}
        style={{
          width: size,
          height: size,
          minHeight: 0,
          resizeMode: "contain",
          transform: pose === "bow" ? [{ rotate: "-3deg" }] : undefined,
        }}
        accessibilityIgnoresInvertColors
      />
    </View>
  )
}
