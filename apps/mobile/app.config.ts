import type { ExpoConfig } from "expo/config"

import json from "./app.json"

const base = json.expo as ExpoConfig

/**
 * `app.json` stays the source of truth for the static config; this file only
 * registers the local plugin that has to run during prebuild. See
 * plugins/withCleartextTraffic.ts for why the flag is an env var.
 */
export default (): ExpoConfig => ({
  ...base,
  plugins: [...(base.plugins ?? []), "./plugins/withCleartextTraffic"],
})
