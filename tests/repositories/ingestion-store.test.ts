import { beforeEach, describe, expect, it, vi } from "vitest";

const DUPLICATE_SEED_PATH =
  "/Health/MEDICAL RECORDS BY YEAR/2025/GP/GP_DR.Kennard_Jan_17_2025_After_Visit_Summary.PDF";

const MISSING_FILE_PATH = "/tmp/MEDICAL RECORDS BY YEAR/2025/GP/GP_Missing_Record_Jan_20_2025.pdf";

async function loadModules() {
  const ingestion = await import("@/lib/services/ingestion-service");
  const store = await import("@/lib/repositories/store");
  return { ...ingestion, ...store };
}

describe("in-memory ingestion orchestration", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unmock("@/lib/services/pdf-extractor");
  });

  it("increments duplicate counters for known fingerprints", async () => {
    const { normalizeDriveFiles, runImportJob } = await loadModules();

    const normalized = normalizeDriveFiles([
      {
        path: DUPLICATE_SEED_PATH,
        modifiedTime: "2026-01-01T00:00:00.000Z",
        size: 1280
      }
    ]);

    const job = await runImportJob({
      mode: "sync",
      actor: "test",
      scannedFiles: 1,
      accepted: normalized.accepted,
      rejected: normalized.rejected
    });

    expect(job.summary.duplicates).toBe(1);
    expect(job.summary.created).toBe(0);
    expect(job.summary.retryAttempts).toBe(0);
    expect(job.summary.deadLettered).toBe(0);
  });

  it("keeps parse failures visible while still creating the document record", async () => {
    const { normalizeDriveFiles, runImportJob, getRecordById } = await loadModules();

    const normalized = normalizeDriveFiles([
      {
        path: MISSING_FILE_PATH,
        modifiedTime: "2026-01-01T00:00:00.000Z",
        size: 2560
      }
    ]);

    const job = await runImportJob({
      mode: "backfill",
      actor: "test",
      scannedFiles: 1,
      accepted: normalized.accepted,
      rejected: normalized.rejected
    });

    expect(job.summary.created).toBe(1);
    expect(job.summary.failed).toBe(0);

    const importedItem = job.items.find((item) => item.status === "imported");
    expect(importedItem?.documentId).toBeTruthy();

    const record = getRecordById(importedItem?.documentId as string);
    expect(record?.parseStatus).toBe("failed");
    expect(record?.parseError).toContain("file_not_found");
  });
});
