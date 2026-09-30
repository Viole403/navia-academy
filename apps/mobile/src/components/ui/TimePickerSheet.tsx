import { useRef, useState } from "react"
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native"
import Animated, { FadeIn, FadeOut, SlideInDown } from "react-native-reanimated"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useTheme } from "@/theme/ThemeProvider"
import { paperType } from "@/theme/paperType"

const HOURS = Array.from({ length: 24 }, (_, i) => i)
const MINUTES = [0, 15, 30, 45]
const ITEM = 44
const VISIBLE = 5

function pad(n: number) {
  return n < 10 ? `0${n}` : String(n)
}

export function formatTime(hour: number, minute: number) {
  return `${pad(hour)}:${pad(minute)}`
}

export function parseTime(value: string | undefined) {
  const [h, m] = (value ?? "20:00").split(":")
  const hour = Number(h)
  const minute = Number(m)
  return {
    hour: Number.isFinite(hour) && hour >= 0 && hour < 24 ? hour : 20,
    minute: MINUTES.includes(minute) ? minute : 0,
  }
}

/**
 * Hour and minute wheel, in the app's own paper palette.
 *
 * A real picker replaces the eight fixed slots. The minute wheel steps by
 * quarter hours rather than one, because a daily reminder is still a coarse
 * decision — but the hour is now the learner's rather than a list of eight
 * times we guessed at.
 */
export function TimePickerSheet({
  visible,
  value,
  onCancel,
  onConfirm,
}: {
  visible: boolean
  value: string | undefined
  onCancel: () => void
  onConfirm: (time: string) => void
}) {
  const { paper } = useTheme()
  const insets = useSafeAreaInsets()
  const start = parseTime(value)
  const [hour, setHour] = useState(start.hour)
  const [minute, setMinute] = useState(start.minute)
  const initialised = useRef(false)

  // Reset the wheels each time the sheet opens, so a cancelled edit does not
  // leave the next open showing the abandoned value.
  if (visible && !initialised.current) {
    initialised.current = true
    setHour(start.hour)
    setMinute(start.minute)
  }
  if (!visible) initialised.current = false

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onCancel}
    >
      <Animated.View
        entering={FadeIn.duration(140)}
        exiting={FadeOut.duration(120)}
        style={styles.backdrop}
      >
        <Pressable
          style={styles.backdropTap}
          onPress={onCancel}
          accessibilityLabel="close"
        />
        <Animated.View
          entering={SlideInDown.duration(220)}
          style={[
            styles.sheet,
            {
              backgroundColor: paper.card,
              borderColor: paper.line,
              paddingBottom: Math.max(insets.bottom, 16),
            },
          ]}
        >
          <View style={styles.header}>
            <Pressable
              onPress={onCancel}
              hitSlop={10}
              accessibilityRole="button"
            >
              <Text style={[paperType.link, { color: paper.inkMuted }]}>
                Cancel
              </Text>
            </Pressable>
            <Text style={[paperType.cardTitleSm, { color: paper.ink }]}>
              Reminder time
            </Text>
            <Pressable
              hitSlop={10}
              accessibilityRole="button"
              onPress={() => onConfirm(formatTime(hour, minute))}
            >
              <Text style={[paperType.link, { color: paper.coral }]}>Save</Text>
            </Pressable>
          </View>

          <View style={[styles.wheels, { borderColor: paper.line }]}>
            <Wheel
              data={HOURS}
              selected={hour}
              onSelect={setHour}
              render={(h) => pad(h)}
            />
            <View style={[styles.divider, { backgroundColor: paper.line }]} />
            <Wheel
              data={MINUTES}
              selected={minute}
              onSelect={setMinute}
              render={(m) => pad(m)}
            />
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  )
}

function Wheel({
  data,
  selected,
  onSelect,
  render,
}: {
  data: number[]
  selected: number
  onSelect: (v: number) => void
  render: (v: number) => string
}) {
  const { paper } = useTheme()
  const ref = useRef<ScrollView>(null)
  // ScrollView has no initialScrollIndex, and scrolling from an effect is a no-op
  // because the content has no size yet — so it happens once the content lands.
  const [placed, setPlaced] = useState(false)
  const place = () => {
    if (placed) return
    ref.current?.scrollTo({
      y: Math.max(0, data.indexOf(selected)) * ITEM,
      animated: false,
    })
    setPlaced(true)
  }
  return (
    <ScrollView
      ref={ref}
      showsVerticalScrollIndicator={false}
      snapToInterval={ITEM}
      decelerationRate="fast"
      contentContainerStyle={{ paddingVertical: ITEM * ((VISIBLE - 1) / 2) }}
      onContentSizeChange={place}
      onLayout={place}
      onMomentumScrollEnd={(e) => {
        const i = Math.round(e.nativeEvent.contentOffset.y / ITEM)
        if (data[i] !== undefined) onSelect(data[i])
      }}
      accessibilityRole="adjustable"
    >
      <View
        style={[
          styles.marker,
          { backgroundColor: paper.coralSoft, borderColor: paper.coral },
        ]}
      />
      {data.map((v) => (
        <Pressable
          key={v}
          onPress={() => {
            onSelect(v)
            ref.current?.scrollTo({ y: data.indexOf(v) * ITEM, animated: true })
          }}
          style={styles.item}
        >
          <Text
            style={[
              paperType.cardTitle,
              { color: v === selected ? paper.ink : paper.inkMuted },
            ]}
          >
            {render(v)}
          </Text>
        </Pressable>
      ))}
      <View
        style={[
          styles.marker,
          { backgroundColor: paper.coralSoft, borderColor: paper.coral },
        ]}
      />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: "flex-end" },
  backdropTap: { flex: 1 },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    paddingTop: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  wheels: {
    flexDirection: "row",
    height: ITEM * VISIBLE,
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  divider: { width: 1, marginVertical: 8 },
  item: {
    height: ITEM,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  marker: {
    position: "absolute",
    zIndex: 0,
    left: 8,
    right: 8,
    top: ITEM * 2,
    height: ITEM,
    borderRadius: 12,
    borderWidth: 1,
  },
})
