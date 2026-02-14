import { beforeEach, describe, expect, it, vi } from "vitest";

const IMPORT_FILE_PATH = "/tmp/MEDICAL RECORDS BY YEAR/2025/GP/Route_Smoke_Test_Jan_20_2025.pdf";

describe("Phase 02 API smoke", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("returns additive retry/dead-letter fields for import jobs", async () => {
    const { POST: runBackfill } = await import("@/app/api/import/backfill/route");
    const { GET: listJobs } = await import("@/app/api/import/jobs/route");

    const response = await runBackfill(
      new Request("http://localhost/api/import/backfill", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          files: [
            {
              path: IMPORT_FILE_PATH,
              modifiedTime: "2026-01-01T00:00:00.000Z",
              size: 512
            }
          ],
          initiatedBy: "test"
        })
      })
    );

    expect(response.status).toBe(200);
    const payload = (await response.json()) as { summary: { retryAttempts: number; deadLettered: number } };
    expect(typeof payload.summary.retryAttempts).toBe("number");
    expect(typeof payload.summary.deadLettered).toBe("number");

    const jobsResponse = await listJobs();
    const jobsPayload = (await jobsResponse.json()) as {
      jobs: Array<{ summary: { retryAttempts: number; deadLettered: number } }>;
    };

    expect(jobsPayload.jobs.length).toBeGreaterThan(0);
    expect(typeof jobsPayload.jobs[0]?.summary.retryAttempts).toBe("number");
    expect(typeof jobsPayload.jobs[0]?.summary.deadLettered).toBe("number");
  });

  it("approves a verification task through the route handler", async () => {
    const { POST: approveTask } = await import("@/app/api/verification/[entityId]/approve/route");

    const response = await approveTask(
      new Request("http://localhost/api/verification/verify_seed_1/approve", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ reviewer: "test" })
      }),
      { params: { entityId: "verify_seed_1" } }
    );

    expect(response.status).toBe(200);
    const payload = (await response.json()) as { task?: { status: string } };
    expect(payload.task?.status).toBe("approved");
  });
});
