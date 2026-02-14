import { NextResponse } from "next/server";
import { listImportJobs } from "@/lib/repositories/runtime";

export async function GET(): Promise<NextResponse> {
  const jobs = await listImportJobs();
  return NextResponse.json({ jobs, count: jobs.length });
}
