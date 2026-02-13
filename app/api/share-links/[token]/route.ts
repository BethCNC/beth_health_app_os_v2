import { NextResponse } from "next/server";
import { accessShareLink, getClinicalSnapshot, listRecords, listTimeline } from "@/lib/repositories/store";

export async function GET(
  request: Request,
  context: { params: { token: string } }
): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const password = searchParams.get("password");

  if (!password) {
    return NextResponse.json({ error: "Password query parameter is required" }, { status: 400 });
  }

  const access = accessShareLink(context.params.token, password, "provider");
  if (!access.ok) {
    return NextResponse.json({ error: access.reason }, { status: 403 });
  }

  return NextResponse.json({
    shareLinkId: access.link?.id,
    snapshot: getClinicalSnapshot(),
    timeline: listTimeline({}),
    documents: listRecords({}).slice(0, 50)
  });
}
