/**
 * Content export bridge CLI: apps/backend → data/json.
 *
 *   pnpm sync-content                 # fetch + merge into data/json
 *   pnpm sync-content --check-only    # dry-run: report what WOULD change
 *   pnpm sync-content --publish       # merge, then chain into publish-data
 *   pnpm sync-content --lang zh --domain vocabulary
 *
 * Env: CONTENT_API_BASE_URL (default http://localhost:8080) and
 * CONTENT_EXPORT_TOKEN (must equal apps/backend's value) — see .env.example.
 */

import { runSync } from "./lib/sync-content";

async function main() {
  const args = process.argv.slice(2);
  const flag = (name: string) => args.includes(name);
  const value = (name: string) => {
    const i = args.indexOf(name);
    return i > -1 ? args[i + 1] : undefined;
  };

  await runSync({
    publish: flag("--publish"),
    checkOnly: flag("--check-only"),
    lang: value("--lang"),
    domain: value("--domain"),
  });
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
