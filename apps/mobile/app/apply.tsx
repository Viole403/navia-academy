import { useState } from "react"
import { Alert, ScrollView, Text, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useRouter } from "expo-router"
import { useMutation } from "@tanstack/react-query"
import { Input } from "@/components/ui/Input"
import { Motif } from "@/components/ui/Motif"
import { LiftedFace, QuietPill } from "@/components/study/PaperCard"
import { BackLink } from "@/components/ui/BackLink"
import { useTheme } from "@/theme/ThemeProvider"
import { useContentLayout } from "@/theme/layout"
import { paperType } from "@/theme/paperType"
import { community } from "@/api/endpoints"
import { motifChar } from "@/lib/languages"
import { useOnboardingStore } from "@/store/onboarding"
import { useT } from "@/i18n"

type Mode = "contributor" | "sponsor"

export default function Apply() {
  const { paper } = useTheme()
  const { column } = useContentLayout()
  const router = useRouter()
  const t = useT()
  const language = useOnboardingStore((s) => s.language)
  const [mode, setMode] = useState<Mode>("contributor")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [area, setArea] = useState("")
  const [message, setMessage] = useState("")

  const applyM = useMutation({
    mutationFn: async () => {
      if (mode === "contributor") {
        return community.applyContributor({
          name: name.trim(),
          email: email.trim(),
          contribution_area: area.trim(),
          message: message.trim() || undefined,
        })
      }
      return community.applySponsor({
        company_name: name.trim(),
        email: email.trim(),
        message: message.trim() || undefined,
      })
    },
    onSuccess: () => {
      Alert.alert(t("apply.applied"), t("apply.appliedMsg"), [
        {
          text: t("apply.ok"),
          // Guarded like the header arrow: reaching /apply by deep link leaves
          // nothing to pop, and `router.back()` on an empty stack does nothing
          // at all — a dismiss button that looks live and is dead.
          onPress: () =>
            router.canGoBack() ? router.back() : router.replace("/(tabs)"),
        },
      ])
    },
    onError: (e: unknown) => {
      const msg = (
        e as { response?: { data?: { error?: { message?: string } } } }
      )?.response?.data?.error?.message
      Alert.alert(t("apply.failed"), msg ?? t("apply.submitFail"))
    },
  })

  const canSubmit =
    !!name.trim() && !!email.trim() && (mode === "sponsor" || !!area.trim())

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: paper.paper }}
      edges={["top"]}
    >
      <ScrollView
        contentContainerStyle={{
          padding: 20,
          paddingBottom: 48,
          gap: 22,
          maxWidth: column,
          width: "100%",
          alignSelf: "center",
        }}
      >
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
          }}
        >
          <BackLink label={t("common.back")} fallback="/(tabs)" />
          <Text style={[paperType.label, { color: paper.inkMuted }]}>
            {t("apply.kicker")}
          </Text>
        </View>
        <View style={{ height: 1, backgroundColor: paper.line }} />

        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 16,
          }}
        >
          <View style={{ flex: 1, gap: 8 }}>
            <Text style={[paperType.label, { color: paper.inkMuted }]}>
              {t("apply.joinTitle")}
            </Text>
            <Text
              style={[
                paperType.greeting,
                { color: paper.ink, fontSize: 30, lineHeight: 34 },
              ]}
            >
              {mode === "contributor"
                ? t("apply.contribute")
                : t("apply.sponsor")}
            </Text>
          </View>
          <Motif char={motifChar(language)} size={56} />
        </View>

        {/* Two ways in, side by side, equal weight — this is a choice of who
            you are rather than a filter, so it reads as two options rather
            than a switch with a position. */}
        <View style={{ flexDirection: "row", gap: 8 }}>
          {(
            [
              ["contributor", t("apply.contributorMode")],
              ["sponsor", t("apply.sponsorMode")],
            ] as [Mode, string][]
          ).map(([value, label]) => (
            <QuietPill
              key={value}
              title={label}
              onPress={() => setMode(value)}
              tone={mode === value ? "challenge" : "plain"}
            />
          ))}
        </View>

        <View style={{ gap: 16 }}>
          <Input
            label={
              mode === "contributor"
                ? t("apply.nameLabel")
                : t("apply.companyLabel")
            }
            value={name}
            onChangeText={setName}
            autoCapitalize={mode === "contributor" ? "words" : "sentences"}
          />
          <Input
            label={t("apply.email")}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          {mode === "contributor" && (
            <Input
              label={t("apply.areaLabel")}
              value={area}
              onChangeText={setArea}
            />
          )}
          <Input
            label={t("apply.message")}
            value={message}
            onChangeText={setMessage}
            multiline
            numberOfLines={4}
          />
        </View>

        <LiftedFace
          title={t("apply.submit")}
          face={paper.green}
          disabled={!canSubmit || applyM.isPending}
          onPress={() => applyM.mutate()}
          style={{ marginTop: "auto" }}
        />
      </ScrollView>
    </SafeAreaView>
  )
}
