import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Button } from "@/components/ui/Button";
import { Motif } from "@/components/ui/Motif";
import { useTheme } from "@/theme/ThemeProvider";
import { fonts, type } from "@/theme/typography";

export default function Welcome() {
  const { theme } = useTheme();
  const router = useRouter();

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
                Read Chinese
                {"\n"}
                <Text style={{ color: theme.accent, fontStyle: "italic" }}>
                  like print.
                </Text>
              </Text>
            </View>
            <Motif char="学" size={72} />
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
              "Learning a language is to have one more window from which to look at the world."
            </Text>
            <Text style={[type.caption, { color: theme.textMuted }]}>
              — Chinese proverb
            </Text>
          </View>
        </View>

        {/* Cover Hanzi */}
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
            你
          </Text>
          <Text
            style={[
              type.labelSm,
              { color: theme.textMuted, letterSpacing: 3, marginTop: -8 },
            ]}
          >
            nǐ · you
          </Text>
        </View>

        {/* CTAs */}
        <View style={{ gap: 12 }}>
          <Button
            title="Create an account"
            size="lg"
            onPress={() => router.push("/(auth)/register")}
          />
          <Button
            title="Sign in"
            variant="ghost"
            onPress={() => router.push("/(auth)/login")}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
