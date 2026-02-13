import { NextResponse } from "next/server";
import { getImportJobById } from "@/lib/repositories/store";

export async function GET(
  _request: Request,
  context: { params: { jobId: string } }
): Promise<NextResponse> {
  const job = getImportJobById(context.params.jobId);
  if (!job) {
    return NextResponse.json({ error: "Import job not found" }, { status: 404 });
  }

  return NextResponse.json({ job });
}
