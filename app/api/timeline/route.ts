import { NextResponse } from "next/server";
import { listTimeline } from "@/lib/repositories/runtime";

export async function GET(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);

  const verifiedParam = searchParams.get("verified");
  const verified = verifiedParam === "true" ? true : verifiedParam === "false" ? false : undefined;

  const data = await listTimeline({
    from: searchParams.get("from") ?? undefined,
    to: searchParams.get("to") ?? undefined,
    condition: searchParams.get("condition")?.toLowerCase() ?? undefined,
    type: searchParams.get("type") ?? undefined,
    specialty: searchParams.get("specialty") ?? undefined,
    episodeId: searchParams.get("episodeId") ?? undefined,
    verified
  });

  return NextResponse.json(data);
}
