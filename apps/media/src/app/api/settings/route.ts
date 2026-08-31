import { NextRequest } from "next/server"
import {
  MEDIA_SETTING_KEYS,
  deleteMediaSetting,
  readMediaSettings,
  saveMediaSetting,
  type MediaSettingKey,
} from "@/lib/settings"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const overrides = await readMediaSettings()
    return Response.json({
      success: true,
      data: {
        overrides,
        env: {
          imageProvider: process.env.MEDIA_IMAGE_PROVIDER ?? "",
          ttsEngine: process.env.MEDIA_TTS_ENGINE ?? "",
          visionProvider: process.env.MEDIA_VISION_PROVIDER ?? "",
        },
      },
    })
  } catch (err) {
    return Response.json(
      {
        success: false,
        error: {
          code: "SETTINGS_ERROR",
          message: err instanceof Error ? err.message : "failed",
        },
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      key?: string
      value?: string
    }
    const key = body.key as MediaSettingKey
    if (typeof key !== "string" || !MEDIA_SETTING_KEYS.includes(key)) {
      return Response.json(
        {
          success: false,
          error: {
            code: "VALIDATION",
            message: `unknown setting key (allowed: ${MEDIA_SETTING_KEYS.join(", ")})`,
          },
        },
        { status: 400 }
      )
    }
    if (typeof body.value === "string" && body.value) {
      await saveMediaSetting(key, body.value)
    } else {
      // Empty value → reset to env/default.
      await deleteMediaSetting(key)
    }
    return Response.json({ success: true, data: { ok: true } })
  } catch (err) {
    return Response.json(
      {
        success: false,
        error: {
          code: "SETTINGS_ERROR",
          message: err instanceof Error ? err.message : "failed",
        },
      },
      { status: 500 }
    )
  }
}
