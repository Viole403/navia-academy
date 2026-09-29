import { useState } from "react"
import { Ionicons } from "@expo/vector-icons"
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  Pressable,
  Text,
  View,
} from "react-native"
import Constants from "expo-constants"
import { router, useRouter } from "expo-router"
import { DetailShell } from "@/components/study/DetailShell"
import {
  SettingsGroup,
  SettingsRow,
  SettingsState,
} from "@/components/settings/SettingsGroup"
import { LiftedFace, PaperCard } from "@/components/study/PaperCard"
import { useTheme } from "@/theme/ThemeProvider"
import { useUserSettings } from "@/hooks/useUserSettings"
import { useT } from "@/i18n"
import { Input } from "@/components/ui/Input"
import { fonts, type } from "@/theme/typography"
import { EmptyState } from "@/components/ui/EmptyState"
import { auth, community } from "@/api/endpoints"
import { useAuthStore } from "@/store/auth"
import { useOnboardingStore } from "@/store/onboarding"
import { useMutation, useQuery } from "@tanstack/react-query"

const LINKS = [
  { id: "source", icon: "logo-github", url: "https://github.com" },
  { id: "docs", icon: "book", url: "https://developer.mozilla.org" },
] as const

/**
 * About.
 *
 * Sign-out lives here rather than on the profile screen because it is the one
 * action in the app that is destructive to the *session* rather than to the
 * account, and burying it under a profile header is how people sign out by
 * accident. It is confirmed, because the cost of a mis-tap is losing a streak.
 */
export default function SettingsAbout() {
  const { theme, paper } = useTheme()
  const t = useT()
  const s = useUserSettings()
  const signOut = useAuthStore((st) => st.signOut)
  const version =
    Constants.expoConfig?.version ??
    Constants.expoConfig?.extra?.version ??
    "1.0.0"

  const confirmSignOut = () => {
    Alert.alert(t("profile.signOutTitle"), t("profile.signOutMsg"), [
      { text: t("profile.cancel"), style: "cancel" },
      {
        text: t("profile.signOut"),
        style: "destructive",
        onPress: async () => {
          try {
            await auth.logout()
          } catch {
            // A failed server logout must not strand the user in a signed-in
            // shell: the local token is cleared either way, which is what the
            // next launch reads.
          }
          signOut()
          router.replace("/(auth)")
        },
      },
    ])
  }

  return (
    <DetailShell title={t("profile.about")} fallback="/settings">
      <View style={{ gap: 22 }}>
        <PaperCard tone="plain">
          <View style={{ alignItems: "center", gap: 6, paddingVertical: 8 }}>
            <Ionicons name="book" size={30} color={paper.inkSoft} />
            <Text
              style={{
                color: theme.text,
                fontSize: 18,
                fontWeight: "700",
              }}
            >
              Navia
            </Text>
            <Text style={{ color: paper.inkMuted, fontSize: 12 }}>
              {t("set.version")} {version} · {Platform.OS}
            </Text>
          </View>
        </PaperCard>

        {s.isLoading ? (
          <SettingsState kind="loading" />
        ) : (
          <SettingsGroup title={t("set.project")}>
            {LINKS.map((l, i) => (
              <SettingsRow
                key={l.id}
                first={i === 0}
                icon={l.icon}
                title={t(`set.link.${l.id}` as never)}
                onPress={() => Linking.openURL(l.url)}
              />
            ))}
          </SettingsGroup>
        )}

        <SettingsGroup title={t("set.session")} last>
          <SettingsRow
            first
            icon="log-out"
            title={t("profile.signOut")}
            sub={t("set.signOutHint")}
            danger
            onPress={confirmSignOut}
          />
        </SettingsGroup>
      </View>
    </DetailShell>
  )
}

function ChangePasswordCard() {
  const { theme, paper } = useTheme()
  const t = useT()
  const [open, setOpen] = useState(false)
  const [current, setCurrent] = useState("")
  const [next, setNext] = useState("")
  const [msg, setMsg] = useState<string | null>(null)

  const changeM = useMutation({
    mutationFn: () => auth.changePassword(current, next),
    onSuccess: () => {
      setCurrent("")
      setNext("")
      setMsg(t("profile.pwChanged"))
    },
    onError: () => setMsg(t("profile.pwFailed")),
  })

  return (
    <PaperCard>
      <View style={{ gap: 12 }}>
        <Pressable
          onPress={() => setOpen((o) => !o)}
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Text style={[type.labelSm, { color: theme.textMuted }]}>
            {t("profile.changePw")}
          </Text>
          <Text style={[type.body, { color: paper.inkMuted }]}>
            {open ? "−" : "+"}
          </Text>
        </Pressable>
        {open && (
          <View style={{ gap: 12 }}>
            <Input
              label={t("profile.currentPw")}
              value={current}
              onChangeText={(v) => {
                setCurrent(v)
                setMsg(null)
              }}
              secureTextEntry
              autoCapitalize="none"
            />
            <Input
              label={t("profile.newPw")}
              hint={t("profile.pwHint")}
              value={next}
              onChangeText={(v) => {
                setNext(v)
                setMsg(null)
              }}
              secureTextEntry
              autoCapitalize="none"
            />
            {!!msg && (
              <Text style={[type.bodySm, { color: theme.textMuted }]}>
                {msg}
              </Text>
            )}
            <LiftedFace
              small
              title={
                changeM.isPending ? t("profile.saving") : t("profile.updatePw")
              }
              face={paper.green}
              disabled={!current || next.length < 8 || changeM.isPending}
              onPress={() => changeM.mutate()}
            />
          </View>
        )}
      </View>
    </PaperCard>
  )
}

// ─── About section ─────────────────────────────────────────────────────────

export function AboutSection() {
  const { theme, paper } = useTheme()
  const t = useT()
  const router = useRouter()
  const language = useOnboardingStore((s) => s.language)
  const contributorsQ = useQuery({
    queryKey: ["contributors"],
    queryFn: () => community.contributors(50),
  })
  const sponsorsQ = useQuery({
    queryKey: ["sponsors"],
    queryFn: () => community.sponsors(50),
  })

  return (
    <View style={{ gap: 24 }}>
      <View style={{ gap: 8 }}>
        <Text style={[type.display, { color: theme.text, fontSize: 28 }]}>
          Navia Academy
        </Text>
        <Text style={[type.bodySm, { color: theme.textMuted }]}>
          {t("profile.aboutDesc")}
        </Text>
      </View>

      {/* Contributors */}
      <View style={{ gap: 12 }}>
        <Text style={[type.labelSm, { color: theme.textMuted }]}>
          {t("profile.contributors")}
        </Text>
        {contributorsQ.isLoading ? (
          <ActivityIndicator color={theme.accent} />
        ) : (contributorsQ.data ?? []).length === 0 ? (
          <EmptyState title={t("profile.noContrib")} glyph="○" />
        ) : (
          <View style={{ borderTopWidth: 1, borderTopColor: theme.border }}>
            {(contributorsQ.data ?? []).map((c, i, arr) => (
              <View
                key={c.id}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 14,
                  paddingVertical: 12,
                  borderBottomWidth: i === arr.length - 1 ? 1 : 0,
                  borderBottomColor: theme.border,
                }}
              >
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    borderWidth: 1,
                    borderColor: theme.border,
                    backgroundColor: contributorColor(c.name, theme) + "22",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text
                    style={{
                      fontFamily: fonts.serif,
                      fontSize: 18,
                      color: contributorColor(c.name, theme),
                    }}
                  >
                    {c.name.slice(0, 1).toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      type.bodySm,
                      { color: theme.text, fontWeight: "600" },
                    ]}
                  >
                    {c.name}
                  </Text>
                  <Text
                    style={[type.caption, { color: theme.textMuted }]}
                    numberOfLines={1}
                  >
                    {c.contributions.join(" · ")}
                  </Text>
                </View>
                {c.mandarin_level && (
                  <Text style={[type.labelSm, { color: theme.textMuted }]}>
                    {c.mandarin_level.toUpperCase()}
                  </Text>
                )}
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Sponsors */}
      <View style={{ gap: 12 }}>
        <Text style={[type.labelSm, { color: theme.textMuted }]}>
          {t("profile.sponsors")}
        </Text>
        {sponsorsQ.isLoading ? (
          <ActivityIndicator color={theme.accent} />
        ) : (sponsorsQ.data ?? []).length === 0 ? (
          <EmptyState title={t("profile.noSponsors")} glyph="♥" />
        ) : (
          <View style={{ borderTopWidth: 1, borderTopColor: theme.border }}>
            {(sponsorsQ.data ?? []).map((s, i, arr) => (
              <Pressable
                key={s.id}
                onPress={() => s.website && Linking.openURL(s.website)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  paddingVertical: 12,
                  borderBottomWidth: i === arr.length - 1 ? 1 : 0,
                  borderBottomColor: theme.border,
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      type.bodySm,
                      { color: theme.text, fontWeight: "600" },
                    ]}
                  >
                    {s.name}
                  </Text>
                  {s.description && (
                    <Text
                      style={[type.caption, { color: theme.textMuted }]}
                      numberOfLines={1}
                    >
                      {s.description}
                    </Text>
                  )}
                </View>
                {s.tier && (
                  <View
                    style={{
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      borderWidth: 1,
                      borderColor: theme.gold,
                      borderRadius: 12,
                    }}
                  >
                    <Text
                      style={{
                        color: theme.gold,
                        fontSize: 10,
                        fontWeight: "700",
                        letterSpacing: 1,
                      }}
                    >
                      {s.tier.toUpperCase()}
                    </Text>
                  </View>
                )}
                {s.website && (
                  <Text
                    style={{
                      fontFamily: fonts.serif,
                      fontSize: 16,
                      color: paper.inkMuted,
                    }}
                  >
                    →
                  </Text>
                )}
              </Pressable>
            ))}
          </View>
        )}
      </View>

      {/* Apply CTAs */}
      <View style={{ gap: 12, paddingTop: 4 }}>
        <Text style={[type.labelSm, { color: theme.textMuted }]}>
          {t("profile.joinUs")}
        </Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <View style={{ flex: 1 }}>
            <LiftedFace
              small
              title={t("profile.contribute")}
              face={paper.green}
              onPress={() => router.push("/apply")}
            />
          </View>
          <View style={{ flex: 1 }}>
            <LiftedFace
              small
              title={t("profile.sponsor")}
              face={paper.inkSoft}
              textColor={paper.ink}
              onPress={() => router.push("/apply")}
            />
          </View>
        </View>
      </View>
    </View>
  )
}

function contributorColor(
  name: string,
  palette: { accent: string; gold: string; mint: string }
) {
  const colors = [palette.accent, palette.gold, palette.mint]
  let h = 0
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) % 997
  return colors[h % colors.length] ?? palette.accent
}
