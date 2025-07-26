import { cp, mkdir, readdir } from "node:fs/promises";
import { join } from "node:path";

const ROOT = join(__dirname, "..");
const MOBILE = join(ROOT, "..", "mobile");

async function main() {
  const dataAudio = join(ROOT, "data", "audio");
  const mobileAudio = join(MOBILE, "src", "data", "audio");
  await mkdir(mobileAudio, { recursive: true });

  for (const f of ["audio-manifest.json", "voice-map.ts", "index.ts"]) {
    const src = join(dataAudio, f);
    await cp(src, join(mobileAudio, f), { recursive: false }).catch(() => {});
  }
  console.log("✓ data/audio manifest + voice-map → apps/mobile/src/data/audio");

  const copyLocal = process.env.COPY_LOCAL_AUDIO === "1";
  if (copyLocal) {
    const outputAudio = join(ROOT, ".output", "audio");
    const mobileAudioFiles = join(MOBILE, "assets", "audio");
    await mkdir(mobileAudioFiles, { recursive: true });
    const files = await readdir(outputAudio).catch(() => [] as string[]);
    let copied = 0;
    for (const f of files) {
      if (f.endsWith(".mp3")) {
        await cp(join(outputAudio, f), join(mobileAudioFiles, f));
        copied++;
      }
    }
    console.log(`✓ ${copied} audio files → ${mobileAudioFiles}`);
  } else {
    console.log("· skip audio mp3 copy (set COPY_LOCAL_AUDIO=1 untuk offline dev)");
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
