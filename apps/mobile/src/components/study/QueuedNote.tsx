import { Text, View } from "react-native"
import { useTheme } from "@/theme/ThemeProvider"
import { paperType } from "@/theme/paperType"
import { useT } from "@/i18n"

/**
 * An honest note when a study log was saved on the device instead of sent.
 *
 * `logStudyWithQueue` never throws: when the request fails it writes the log to
 * the outbox and resolves `{ ok: true, offline: true }`. Every caller used to
 * drop that flag, so a learner out of signal tapped "Log writing", watched the
 * screen advance to its success state, and left believing the session was
 * stored. It was queued — the minutes and XP only reach the server when the
 * outbox drains, and if the app is never reopened online they never arrive.
 *
 * So the flag is surfaced rather than discarded. Queued is not an error: the
 * work is not lost and the learner did nothing wrong, which is why this reads
 * as a footnote and not a warning.
 */
export function QueuedNote({ show }: { show: boolean }) {
  const { paper } = useTheme()
  const t = useT()
  if (!show) return null
  return (
    <View style={{ flexDirection: "row", gap: 8, alignItems: "flex-start" }}>
      <Text
        style={[paperType.note, { color: paper.inkMuted, marginTop: 1 }]}
        accessibilityElementsHidden
      >
        ⌁
      </Text>
      <Text style={[paperType.note, { color: paper.inkMuted, flex: 1 }]}>
        {t("common.queuedNote")}
      </Text>
    </View>
  )
}
