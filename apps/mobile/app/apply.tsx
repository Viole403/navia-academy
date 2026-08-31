import { useState } from "react"
import { Alert, Pressable, ScrollView, Text, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useRouter } from "expo-router"
import { useMutation } from "@tanstack/react-query"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Motif } from "@/components/ui/Motif"
import { useTheme } from "@/theme/ThemeProvider"
import { fonts, type } from "@/theme/typography"
import { community } from "@/api/endpoints"

type Mode = "contributor" | "sponsor"

export default function Apply() {
  const { theme } = useTheme()
  const router = useRouter()
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
      Alert.alert(
        "Applied",
        "Your application has been sent. We will review it shortly.",
        [{ text: "OK", onPress: () => router.back() }]
      )
    },
    onError: (e: unknown) => {
      const msg = (
        e as { response?: { data?: { error?: { message?: string } } } }
      )?.response?.data?.error?.message
      Alert.alert("Failed", msg ?? "Could not submit. Try again.")
    },
  })

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: theme.bg }}
      edges={["top"]}
    >
      <View
        style={{
          padding: 16,
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottomWidth: 1,
          borderBottomColor: theme.border,
        }}
      >
        <Pressable onPress={() => router.back()}>
          <Text style={{ color: theme.textMuted, fontSize: 16 }}>← Back</Text>
        </Pressable>
        <Text style={[type.labelSm, { color: theme.textMuted }]}>APPLY</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 24, gap: 24, flexGrow: 1 }}>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          <View style={{ flex: 1, gap: 8 }}>
            <Text style={[type.labelSm, { color: theme.textMuted }]}>
              Join the project
            </Text>
            <Text style={[type.display, { color: theme.text, fontSize: 32 }]}>
              {mode === "contributor" ? "Contribute" : "Sponsor"}
            </Text>
          </View>
          <Motif char={mode === "contributor" ? "贡" : "宴"} size={56} />
        </View>

        {/* Mode switcher */}
        <View style={{ flexDirection: "row", gap: 8 }}>
          {(["contributor", "sponsor"] as Mode[]).map((m) => {
            const sel = mode === m
            return (
              <Pressable
                key={m}
                onPress={() => setMode(m)}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  borderRadius: 2,
                  borderWidth: 1.5,
                  borderColor: sel ? theme.text : theme.border,
                  backgroundColor: sel ? theme.text : "transparent",
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    color: sel ? theme.bg : theme.text,
                    fontWeight: "600",
                    fontSize: 13,
                  }}
                >
                  {m === "contributor" ? "Contributor" : "Sponsor"}
                </Text>
              </Pressable>
            )
          })}
        </View>

        {/* Form */}
        <View style={{ gap: 16 }}>
          <Input
            label={mode === "contributor" ? "Full name" : "Company / org name"}
            value={name}
            onChangeText={setName}
            autoCapitalize={mode === "contributor" ? "words" : "sentences"}
          />
          <Input
            label="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          {mode === "contributor" && (
            <Input
              label="Area (e.g. content, audio, translation)"
              value={area}
              onChangeText={setArea}
            />
          )}
          <Input
            label="Message"
            value={message}
            onChangeText={setMessage}
            multiline
            numberOfLines={4}
          />
        </View>

        <View style={{ marginTop: "auto" }}>
          <Button
            title="Submit application"
            onPress={() => applyM.mutate()}
            loading={applyM.isPending}
            disabled={
              !name.trim() ||
              !email.trim() ||
              (mode === "contributor" && !area.trim())
            }
            size="lg"
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
