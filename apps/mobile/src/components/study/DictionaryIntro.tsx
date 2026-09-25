import { Text, View } from "react-native"
import { useTheme } from "@/theme/ThemeProvider"
import { paperType, families } from "@/theme/paperType"
import { Shifu } from "./Shifu"
import { useReveal, useTypewriter } from "./Reveal"
import { useEntranceRun } from "./Reveal"
import { useT } from "@/i18n"

/**
 * The dictionary's browsing header.
 *
 * It is Shifu, not a landscape, and that is the reference's call: a heading, a
 * subtitle and a picture were three things answering one question on a screen
 * whose complaint was clutter. He says what the screen is for, and the sentence
 * types on.
 *
 * The typing is **faster** than the Dashboard's — this line is nearly a hundred
 * characters against the Dashboard's forty, and at the same pace the learner
 * finishes reading long before Shifu finishes writing.
 */
export function DictionaryIntro({ message }: { message: string }) {
  const { paper } = useTheme()
  const run = useEntranceRun()
  const page = useReveal({ at: 0, duration: 460, run, distance: 22 })
  const shifu = useReveal({ at: 240, duration: 420, run, distance: 16 })
  const line = useReveal({ at: 420, duration: 300, run, distance: 12 })
  const typed = useTypewriter(message.length, run, 9)

  return (
    <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 10 }}>
      <View style={{ flex: 1, gap: 8 }}>
        <View
          style={{
            opacity: page.opacity,
            transform: [{ translateY: page.translate }],
          }}
        >
          <Text
            style={[
              paperType.statLabel,
              { color: paper.inkMuted, fontFamily: families.nunitoSemiBold },
            ]}
          >
            {useT()("dict.kicker")}
          </Text>
        </View>
        <View
          style={{
            backgroundColor: paper.card,
            borderColor: paper.line,
            borderWidth: 1,
            borderTopLeftRadius: 4,
            borderRadius: paper.radius.inner,
            padding: 12,
            opacity: line.opacity,
            transform: [{ translateY: line.translate }],
            ...paper.shadow,
          }}
        >
          <Text
            style={[
              paperType.bubble,
              { color: paper.ink, fontFamily: families.nunitoSemiBold },
            ]}
          >
            {message.slice(0, typed)}
          </Text>
        </View>
      </View>
      <View
        style={{
          opacity: shifu.opacity,
          transform: [{ translateY: shifu.translate }],
          width: 74,
        }}
      >
        <Shifu pose="rest" size={74} />
      </View>
    </View>
  )
}
