import { NextResponse } from "next/server";
import { getImportJobById } from "@/lib/repositories/runtime";

export async function GET(
  _request: Request,
  context: { params: { jobId: string } }
): Promise<NextResponse> {
  const job = await getImportJobById(context.params.jobId);
  if (!job) {
    return NextResponse.json({ error: "Import job not found" }, { status: 404 });
  }

  return NextResponse.json({ job });
}
