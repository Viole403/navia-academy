import { NextRequest } from "next/server"
import { listStoredKeys, maskKey, upsertStoredKey } from "@/lib/image-keys"
import { listTtsStoredKeys, upsertTtsStoredKey } from "@/lib/tts-keys"

export const dynamic = "force-dynamic"

function kindOf(req: NextRequest): "image" | "tts" {
  return req.nextUrl.searchParams.get("kind") === "tts" ? "tts" : "image"
}

export async function GET(request: NextRequest) {
  const kind = kindOf(request)
  try {
    const keys =
      kind === "tts" ? await listTtsStoredKeys() : await listStoredKeys()
    return Response.json({
      success: true,
      data: keys.map((k) => ({ ...k, api_key: maskKey(k.api_key) })),
    })
  } catch (err) {
    return Response.json(
      {
        success: false,
        error: {
          code: "KEYS_ERROR",
          message: err instanceof Error ? err.message : "failed",
        },
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const kind = kindOf(request)
  try {
    const body = (await request.json().catch(() => ({}))) as Partial<{
      provider: string
      name: string
      api_key: string
      api_base_url?: string
      model?: string
      cf_account_id?: string
      region?: string
      enabled?: boolean
    }>
    if (!body.provider || !body.name || !body.api_key) {
      return Response.json(
        {
          success: false,
          error: {
            code: "VALIDATION",
            message: "provider, name, and api_key are required",
          },
        },
        { status: 400 }
      )
    }
    const key =
      kind === "tts"
        ? await upsertTtsStoredKey({
            provider: body.provider,
            name: body.name,
            api_key: body.api_key,
            region: body.region,
            enabled: body.enabled,
          })
        : await upsertStoredKey({
            provider: body.provider,
            name: body.name,
            api_key: body.api_key,
            api_base_url: body.api_base_url,
            model: body.model,
            cf_account_id: body.cf_account_id,
            enabled: body.enabled,
          })
    return Response.json({
      success: true,
      data: { ...key, api_key: maskKey(key.api_key) },
    })
  } catch (err) {
    return Response.json(
      {
        success: false,
        error: {
          code: "KEYS_ERROR",
          message: err instanceof Error ? err.message : "failed",
        },
      },
      { status: 500 }
    )
  }
}
