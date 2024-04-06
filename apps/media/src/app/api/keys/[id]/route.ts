import { NextRequest } from "next/server";
import { deleteStoredKey, patchStoredKey } from "@/lib/image-keys";
import { deleteTtsStoredKey, patchTtsStoredKey } from "@/lib/tts-keys";

export const dynamic = "force-dynamic";

interface RouteCtx {
  params: Promise<{ id: string }>;
}

function kindOf(req: NextRequest): "image" | "tts" {
  return req.nextUrl.searchParams.get("kind") === "tts" ? "tts" : "image";
}

export async function PATCH(request: NextRequest, ctx: RouteCtx) {
  const kind = kindOf(request);
  try {
    const { id } = await ctx.params;
    const body = (await request.json().catch(() => ({}))) as Partial<{
      api_key?: string;
      api_base_url?: string;
      model?: string;
      cf_account_id?: string;
      region?: string;
      enabled?: boolean;
      clear_cooldown?: boolean;
    }>;
    const patch: Record<string, unknown> = {};
    if (typeof body.enabled === "boolean") patch.enabled = body.enabled;
    if (typeof body.api_key === "string" && body.api_key) patch.api_key = body.api_key;
    if (body.clear_cooldown === true) patch.cooldown_until = null;
    if (kind === "tts") {
      if (typeof body.region === "string") patch.region = body.region || null;
    } else {
      if (typeof body.api_base_url === "string") patch.api_base_url = body.api_base_url || null;
      if (typeof body.model === "string") patch.model = body.model || null;
      if (typeof body.cf_account_id === "string") patch.cf_account_id = body.cf_account_id || null;
    }
    if (Object.keys(patch).length === 0) {
      return Response.json({ success: false, error: { code: "VALIDATION", message: "nothing to update" } }, { status: 400 });
    }
    if (kind === "tts") await patchTtsStoredKey(id, patch);
    else await patchStoredKey(id, patch);
    return Response.json({ success: true, data: { ok: true } });
  } catch (err) {
    return Response.json({ success: false, error: { code: "KEYS_ERROR", message: err instanceof Error ? err.message : "failed" } }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, ctx: RouteCtx) {
  const kind = kindOf(request);
  try {
    const { id } = await ctx.params;
    if (kind === "tts") await deleteTtsStoredKey(id);
    else await deleteStoredKey(id);
    return Response.json({ success: true, data: { ok: true } });
  } catch (err) {
    return Response.json({ success: false, error: { code: "KEYS_ERROR", message: err instanceof Error ? err.message : "failed" } }, { status: 500 });
  }
}
