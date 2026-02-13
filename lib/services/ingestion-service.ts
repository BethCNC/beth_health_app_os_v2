import { createId } from "@/lib/utils/ids";
import { nowIso } from "@/lib/utils/date";
import type { DriveFileInput } from "@/lib/types/api";
import type { DocumentRecord } from "@/lib/types/domain";
import {
  classifyDocumentType,
  createDocumentFingerprint,
  deriveTags,
  extractEventDate,
  parseDrivePath,
  shouldIngestFile
} from "@/lib/services/ingestion-rules";

export interface IngestionRejectedFile {
  path: string;
  reason: string;
}

export interface NormalizedIngestedDocument {
  record: DocumentRecord;
  fingerprint: string;
}

export interface IngestionResult {
  accepted: NormalizedIngestedDocument[];
  rejected: IngestionRejectedFile[];
}

export function normalizeDriveFiles(files: DriveFileInput[]): IngestionResult {
  const accepted: NormalizedIngestedDocument[] = [];
  const rejected: IngestionRejectedFile[] = [];

  for (const file of files) {
    const eligibility = shouldIngestFile(file.path);
    if (!eligibility.allowed) {
      rejected.push({ path: file.path, reason: eligibility.reason ?? "disallowed" });
      continue;
    }

    const parsedPath = parseDrivePath(file.path);
    if (!parsedPath) {
      rejected.push({ path: file.path, reason: "invalid_path_structure" });
      continue;
    }

    const now = nowIso();
    const record: DocumentRecord = {
      id: createId("doc"),
      sourcePath: file.path,
      sourceSystem: "google_drive",
      fileName: parsedPath.fileName,
      year: parsedPath.year,
      specialty: parsedPath.specialty,
      provider: parsedPath.subfolders[0],
      type: classifyDocumentType(parsedPath.fileName),
      eventDate: extractEventDate(parsedPath.fileName),
      tags: deriveTags(parsedPath.fileName, parsedPath.specialty, parsedPath.year),
      verificationStatus: "pending",
      parseStatus: "not_started",
      fileSizeBytes: file.size,
      modifiedTime: file.modifiedTime,
      createdAt: now,
      updatedAt: now
    };

    accepted.push({
      record,
      fingerprint: createDocumentFingerprint(file.path)
    });
  }

  return { accepted, rejected };
}
