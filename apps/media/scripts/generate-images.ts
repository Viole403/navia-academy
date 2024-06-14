import { generateImageBatch } from "../src/lib/runner-image";
import { guardApiNotRunningCli } from "./lib/api-running-guard";

async function main() {
  await guardApiNotRunningCli();
  const dryRun = process.argv.includes("--dry-run");
  const limitIdx = process.argv.indexOf("--limit");
  const limit = limitIdx > -1 ? Number(process.argv[limitIdx + 1]) : undefined;

  const res = await generateImageBatch({ limit, dryRun });
  console.log(
    `\nDone! Generated: ${res.generated}, Skipped: ${res.skipped}, Errors: ${res.errors} | upload: ${res.upload ? "yes" : "no"}`,
  );
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
