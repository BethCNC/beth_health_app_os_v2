import { beforeEach, describe, expect, it, vi } from "vitest";

const RETRY_FILE_PATH = "/tmp/MEDICAL RECORDS BY YEAR/2025/GP/Retry_Test_Lab_Jan_20_2025.pdf";
const DEAD_LETTER_FILE_PATH = "/tmp/MEDICAL RECORDS BY YEAR/2025/GP/Dead_Letter_Test_Jan_20_2025.pdf";

describe("import retry and dead-letter behavior", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("retries transient failures and succeeds before dead-lettering", async () => {
    const extractPdfText = vi
      .fn()
      .mockRejectedValueOnce(new Error("socket_timeout"))
      .mockResolvedValue({
        text: "Comprehensive metabolic panel showed TSH 2.40 and Creatinine 0.91. Dr Kennard follow-up.",
        pageCount: 1,
        method: "pdfplumber"
      });

    vi.doMock("@/lib/services/pdf-extractor", () => ({ extractPdfText }));

    const { normalizeDriveFiles } = await import("@/lib/services/ingestion-service");
    const { runImportJob } = await import("@/lib/repositories/store");

    const normalized = normalizeDriveFiles([
      {
        path: RETRY_FILE_PATH,
        modifiedTime: "2026-01-01T00:00:00.000Z",
        size: 1024
      }
    ]);

    const job = await runImportJob({
      mode: "sync",
      actor: "test",
      scannedFiles: 1,
      accepted: normalized.accepted,
      rejected: normalized.rejected
    });

    expect(job.summary.created).toBe(1);
    expect(job.summary.failed).toBe(0);
    expect(job.summary.retryAttempts).toBe(1);
    expect(job.summary.deadLettered).toBe(0);

    const importedItem = job.items.find((item) => item.status === "imported");
    expect(importedItem?.attemptCount).toBe(2);
    expect(importedItem?.retryable).toBe(true);
  });

  it("dead-letters non-retryable failures without repeated attempts", async () => {
    const extractPdfText = vi.fn().mockRejectedValue(new Error("file_not_found"));
    vi.doMock("@/lib/services/pdf-extractor", () => ({ extractPdfText }));

    const { normalizeDriveFiles } = await import("@/lib/services/ingestion-service");
    const { runImportJob } = await import("@/lib/repositories/store");

    const normalized = normalizeDriveFiles([
      {
        path: DEAD_LETTER_FILE_PATH,
        modifiedTime: "2026-01-01T00:00:00.000Z",
        size: 1024
      }
    ]);

    const job = await runImportJob({
      mode: "sync",
      actor: "test",
      scannedFiles: 1,
      accepted: normalized.accepted,
      rejected: normalized.rejected
    });

    expect(job.summary.created).toBe(0);
    expect(job.summary.failed).toBe(1);
    expect(job.summary.retryAttempts).toBe(0);
    expect(job.summary.deadLettered).toBe(1);
    expect(job.deadLetters.length).toBe(1);
    expect(job.deadLetters[0]?.retryable).toBe(false);
    expect(job.items[0]?.attemptCount).toBe(1);
    expect(job.items[0]?.retryable).toBe(false);
  });
});
