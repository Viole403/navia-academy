import { View, Text } from "react-native"
import { GoogleSignInButton } from "@/components/ui/GoogleSignInButton"
import { useGoogleAuth } from "@/hooks/useGoogleAuth"
import { useTheme } from "@/theme/ThemeProvider"
import { type } from "@/theme/typography"
import { useT } from "@/i18n"

/**
 * Divider + Google button, mounted only when a client id exists for this build.
 *
 * `useGoogleAuth` calls `Google.useAuthRequest`, which throws during render when
 * the platform client id is missing — so the hook has to stay inside a subtree
 * that is never mounted without configuration, rather than behind a guard in the
 * auth screens.
 */
export function GoogleAuthSection() {
  const { theme } = useTheme()
  const t = useT()
  const google = useGoogleAuth()

  if (!google.configured) return null

  return (
    <>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          alignSelf: "stretch",
        }}
      >
        <View style={{ flex: 1, height: 1, backgroundColor: theme.border }} />
        <Text style={[type.caption, { color: theme.textDim }]}>
          {t("auth.or")}
        </Text>
        <View style={{ flex: 1, height: 1, backgroundColor: theme.border }} />
      </View>
      <GoogleSignInButton
        title={t("auth.google")}
        onPress={google.prompt}
        loading={google.pending}
        disabled={!google.canPrompt}
      />
    </>
  )
}
