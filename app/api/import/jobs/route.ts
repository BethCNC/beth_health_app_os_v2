import { NextResponse } from "next/server";
import { listImportJobs } from "@/lib/repositories/store";

export async function GET(): Promise<NextResponse> {
  const jobs = listImportJobs();
  return NextResponse.json({ jobs, count: jobs.length });
}
