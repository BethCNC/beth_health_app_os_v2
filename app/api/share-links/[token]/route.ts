import { NextResponse } from "next/server";
import { accessShareLink, getClinicalSnapshot, listRecords, listTimeline } from "@/lib/repositories/runtime";

export async function GET(
  request: Request,
  context: { params: { token: string } }
): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const password = searchParams.get("password");

  if (!password) {
    return NextResponse.json({ error: "Password query parameter is required" }, { status: 400 });
  }

  const access = await accessShareLink(context.params.token, password, "provider");
  if (!access.ok) {
    return NextResponse.json({ error: access.reason }, { status: 403 });
  }

  return NextResponse.json({
    shareLinkId: access.link?.id,
    snapshot: await getClinicalSnapshot(),
    timeline: await listTimeline({}),
    documents: (await listRecords({})).slice(0, 50)
  });
}
