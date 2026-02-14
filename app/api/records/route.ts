import { NextResponse } from "next/server";
import { listRecords } from "@/lib/repositories/runtime";

export async function GET(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);

  const records = await listRecords({
    query: searchParams.get("query") ?? undefined,
    type: searchParams.get("type") ?? undefined,
    specialty: searchParams.get("specialty") ?? undefined,
    status: searchParams.get("status") ?? undefined,
    dateFrom: searchParams.get("dateFrom") ?? undefined,
    dateTo: searchParams.get("dateTo") ?? undefined
  });

  return NextResponse.json({ records, count: records.length });
}
