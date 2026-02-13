import { NextResponse } from "next/server";
import { listTimeline } from "@/lib/repositories/store";

export async function GET(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const data = listTimeline({
    from: searchParams.get("from") ?? undefined,
    to: searchParams.get("to") ?? undefined,
    condition: searchParams.get("condition")?.toLowerCase() ?? undefined
  });

  return NextResponse.json(data);
}
