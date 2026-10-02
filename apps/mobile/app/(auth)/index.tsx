import { Text, View } from "react-native"
import { useRouter } from "expo-router"
import { AuthShell } from "@/components/auth/AuthShell"
import { Shifu } from "@/components/study/Shifu"
import { useTheme } from "@/theme/ThemeProvider"
import { useContentFaces } from "@/hooks/useContentFaces"
import { type } from "@/theme/typography"
import { languageInfo, motifChar, motifSub } from "@/lib/languages"
import { useOnboardingStore } from "@/store/onboarding"
import { useT } from "@/i18n"
import { decorArt } from "@/components/study/art"
import { useTargetLanguage } from "@/hooks/useTargetLanguage"

export default function Welcome() {
  const { theme } = useTheme()
  const faces = useContentFaces()
  const router = useRouter()
  const t = useT()
  const language = useTargetLanguage()
  const info = languageInfo(language)

  return (
    <AuthShell
      kicker="Navia Academy"
      title={`${t("welc.read")} ${info.name}`}
      subtitle={t("welc.quote")}
      art={decorArt.mountainsWide}
      artKey="mountainsWide"
      artHeight={190}
      action={t("auth.createAccount")}
      onAction={() => router.push("/(auth)/register")}
      footer={
        <Text
          style={[type.bodySm, { color: theme.textMuted, textAlign: "center" }]}
        >
          {t("auth.haveAccount")}{" "}
          <Text
            onPress={() => router.push("/(auth)/login")}
            style={{ color: theme.accent, fontWeight: "700" }}
          >
            {t("auth.signIn")}
          </Text>
        </Text>
      }
    >
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          gap: 4,
        }}
      >
        {/*
         * The cover glyph is the largest character in the app, and it is set in
         * the *content* face rather than the Latin serif. The serif carries no
         * CJK glyphs, so 你 and あ were falling through to whatever the system
         * picked — which for a traditional-script learner meant the wrong form on
         * the very first screen they saw. A German learner gets their umlaut in
         * the reading face instead of a Chinese one.
         */}
        <Text
          style={{
            fontFamily: faces.display,
            fontSize: 168,
            // The glyph box has to clear the reading underneath it. At 168 with a
            // 190 line box the two overlapped, and the mascot's negative top margin
            // finished the job — NǏ · YOU ended up half-hidden behind the figure.
            lineHeight: 200,
            color: theme.accent,
            fontWeight: "500",
          }}
        >
          {motifChar(language)}
        </Text>
        <Text
          style={[type.labelSm, { color: theme.textMuted, letterSpacing: 3 }]}
        >
          {motifSub(language)}
        </Text>
        <Shifu pose="bow" size={140} style={{ marginTop: 16 }} />
      </View>
    </AuthShell>
  )
}
