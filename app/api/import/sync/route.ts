import { NextResponse } from "next/server";
import { importRequestSchema } from "@/lib/types/api";
import { normalizeDriveFiles } from "@/lib/services/ingestion-service";
import { runImportJob } from "@/lib/repositories/runtime";
import { scanDriveFolder } from "@/lib/services/local-drive-scanner";

export async function POST(request: Request): Promise<NextResponse> {
  const payload = await request.json().catch(() => null);
  const parsed = importRequestSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 });
  }

  const files =
    "files" in parsed.data
      ? parsed.data.files
      : await scanDriveFolder({ rootPath: parsed.data.rootPath, years: parsed.data.years });
  const normalized = normalizeDriveFiles(files);
  const job = await runImportJob({
    mode: "sync",
    actor: parsed.data.initiatedBy,
    scannedFiles: files.length,
    accepted: normalized.accepted,
    rejected: normalized.rejected
  });

  return NextResponse.json({
    mode: "sync",
    jobId: job.id,
    status: job.status,
    summary: job.summary,
    errors: job.errors
  });
}
