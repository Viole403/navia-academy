import { ScrollView, Text, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useRouter } from "expo-router"
import { Button } from "@/components/ui/Button"
import { Enter } from "@/components/ui/Enter"
import { Motif } from "@/components/ui/Motif"
import { useTheme } from "@/theme/ThemeProvider"
import { fonts, type } from "@/theme/typography"
import { languageInfo, motifChar, motifSub } from "@/lib/languages"
import { useOnboardingStore } from "@/store/onboarding"
import { useT } from "@/i18n"

export default function Welcome() {
  const { theme } = useTheme()
  const router = useRouter()
  const t = useT()
  const language = useOnboardingStore((s) => s.language)
  const info = languageInfo(language)

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          padding: 32,
          gap: 24,
          justifyContent: "space-between",
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Masthead */}
        <Enter index={0}>
          <View style={{ gap: 32, marginTop: 24 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "flex-start",
                justifyContent: "space-between",
              }}
            >
              <View style={{ flex: 1, gap: 12 }}>
                <Text style={[type.labelSm, { color: theme.textMuted }]}>
                  Navia Academy
                </Text>
                <Text
                  style={[
                    type.display,
                    {
                      color: theme.text,
                    },
                  ]}
                >
                  {t("welc.read")} {info.name}
                  {"\n"}
                  <Text style={{ color: theme.accent, fontStyle: "italic" }}>
                    {t("welc.likePrint")}
                  </Text>
                </Text>
              </View>
              <Motif char={motifChar(language)} size={72} />
            </View>

            {/* Pull quote with hairline frame */}
            <View
              style={{
                paddingVertical: 16,
                borderTopWidth: 1,
                borderBottomWidth: 1,
                borderColor: theme.border,
                gap: 8,
              }}
            >
              <Text
                style={{
                  fontFamily: fonts.serif,
                  fontStyle: "italic",
                  fontSize: 18,
                  lineHeight: 28,
                  color: theme.text,
                }}
              >
                “{t("welc.quote")}”
              </Text>
              <Text style={[type.caption, { color: theme.textMuted }]}>
                {t("welc.quoteBy")}
              </Text>
            </View>
          </View>
        </Enter>

        {/* Cover glyph */}
        <Enter index={1}>
          <View style={{ alignItems: "center", paddingVertical: 16 }}>
            <Text
              style={{
                fontFamily: fonts.serif,
                fontSize: 180,
                lineHeight: 200,
                color: theme.accent,
                fontWeight: "500",
              }}
            >
              {motifChar(language)}
            </Text>
            <Text
              style={[
                type.labelSm,
                { color: theme.textMuted, letterSpacing: 3, marginTop: -8 },
              ]}
            >
              {motifSub(language)}
            </Text>
          </View>
        </Enter>

        {/* CTAs */}
        <Enter index={2}>
          <View style={{ gap: 12 }}>
            <Button
              title={t("auth.createAccount")}
              size="lg"
              onPress={() => router.push("/(auth)/register")}
            />
            <Button
              title={t("auth.signIn")}
              variant="ghost"
              onPress={() => router.push("/(auth)/login")}
            />
          </View>
        </Enter>
      </ScrollView>
    </SafeAreaView>
  )
}
