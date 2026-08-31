import { status } from "@/lib/pipeline"

export async function GET() {
  try {
    return Response.json(await status())
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "status failed" },
      { status: 500 }
    )
  }
}
