import { useEffect, useState } from "react"
import * as WebBrowser from "expo-web-browser"
import { ResponseType } from "expo-auth-session"
import * as Google from "expo-auth-session/providers/google"
import { useRouter } from "expo-router"
import { auth } from "@/api/endpoints"
import { useAuthStore } from "@/store/auth"
import { env } from "@/utils/env"
import { saveTokens } from "@/utils/secure"

WebBrowser.maybeCompleteAuthSession()

export function useGoogleAuth() {
  const router = useRouter()
  const setAuth = useAuthStore((s) => s.setAuth)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const configured = !!(env.google.android || env.google.ios || env.google.web)

  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId: env.google.android,
    iosClientId: env.google.ios,
    webClientId: env.google.web,
    clientId: env.google.web,
    responseType: ResponseType.IdToken,
  })

  useEffect(() => {
    if (!response) return
    if (response.type === "error") {
      setError("Google sign-in was cancelled or failed.")
      return
    }
    if (response.type !== "success") return
    const idToken = (response.params as { id_token?: string })?.id_token
    if (!idToken) {
      setError("Google did not return an ID token.")
      return
    }
    setPending(true)
    auth
      .googleExchange(idToken)
      .then(async (data) => {
        await saveTokens({
          accessToken: data.token_pair.access_token,
          refreshToken: data.token_pair.refresh_token,
        })
        setAuth(
          data.user,
          data.token_pair.access_token,
          data.token_pair.refresh_token
        )
        router.replace("/(tabs)")
      })
      .catch(() => {
        setError("Google sign-in failed. Try again.")
      })
      .finally(() => {
        setPending(false)
      })
  }, [response, router, setAuth])

  return {
    configured,
    canPrompt: !!request && !pending,
    pending,
    error,
    prompt: () => {
      setError(null)
      void promptAsync()
    },
  }
}
