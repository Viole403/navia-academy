import type { ConfigPlugin } from "expo/config-plugins"
import { withAndroidManifest } from "expo/config-plugins"

/**
 * Android has blocked cleartext HTTP by default since API 28, so a release build
 * pointed at a plain-http backend blocks the request inside the app's own
 * network security config, never sees a response, and reports it as a generic
 * "Sign in failed" — which looks like bad credentials.
 *
 * Released builds stay strict. An internal test build opts in with
 * EXPO_ALLOW_CLEARTEXT=1, which the native build workflow sets automatically when
 * the configured API URL is itself plain http.
 *
 * Set through the manifest attribute rather than `android.usesCleartextTraffic`
 * in app.json: SDK 57 dropped that config key, so it is silently ignored.
 */
const withCleartextTraffic: ConfigPlugin = (config) => {
  const allowed = process.env.EXPO_ALLOW_CLEARTEXT === "1"

  return withAndroidManifest(config, (cfg) => {
    const application = cfg.modResults.manifest.application?.[0]
    if (application) {
      application.$["android:usesCleartextTraffic"] = allowed ? "true" : "false"
    }
    return cfg
  })
}

export default withCleartextTraffic
