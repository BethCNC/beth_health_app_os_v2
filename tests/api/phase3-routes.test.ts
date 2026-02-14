import { beforeEach, describe, expect, it, vi } from "vitest";

describe("Phase 03 API — Verification and Record UX", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  describe("Records API with filters", () => {
    it("lists records without filters", async () => {
      const { GET: listRecords } = await import("@/app/api/records/route");

      const response = await listRecords(
        new Request("http://localhost/api/records", { method: "GET" })
      );

      expect(response.status).toBe(200);
      const payload = (await response.json()) as { records: unknown[]; count: number };
      expect(Array.isArray(payload.records)).toBe(true);
      expect(payload.count).toBeGreaterThanOrEqual(0);
    });

    it("filters records by verification status", async () => {
      const { GET: listRecords } = await import("@/app/api/records/route");

      const response = await listRecords(
        new Request("http://localhost/api/records?status=verified", { method: "GET" })
      );

      expect(response.status).toBe(200);
      const payload = (await response.json()) as { records: Array<{ verificationStatus: string }> };
      
      // All returned records should be verified
      for (const record of payload.records) {
        expect(record.verificationStatus).toBe("verified");
      }
    });

    it("filters records by pending status", async () => {
      const { GET: listRecords } = await import("@/app/api/records/route");

      const response = await listRecords(
        new Request("http://localhost/api/records?status=pending", { method: "GET" })
      );

      expect(response.status).toBe(200);
      const payload = (await response.json()) as { records: Array<{ verificationStatus: string }> };
      
      for (const record of payload.records) {
        expect(record.verificationStatus).toBe("pending");
      }
    });

    it("filters records by specialty", async () => {
      const { GET: listRecords } = await import("@/app/api/records/route");

      const response = await listRecords(
        new Request("http://localhost/api/records?specialty=primary_care", { method: "GET" })
      );

      expect(response.status).toBe(200);
      const payload = (await response.json()) as { records: Array<{ specialty: string }> };
      
      for (const record of payload.records) {
        expect(record.specialty).toBe("primary_care");
      }
    });

    it("combines multiple filters", async () => {
      const { GET: listRecords } = await import("@/app/api/records/route");

      const response = await listRecords(
        new Request("http://localhost/api/records?status=verified&type=summary", { method: "GET" })
      );

      expect(response.status).toBe(200);
      const payload = (await response.json()) as { 
        records: Array<{ verificationStatus: string; type: string }> 
      };
      
      for (const record of payload.records) {
        expect(record.verificationStatus).toBe("verified");
        expect(record.type).toBe("summary");
      }
    });

    it("searches records by query string", async () => {
      const { GET: listRecords } = await import("@/app/api/records/route");

      const response = await listRecords(
        new Request("http://localhost/api/records?query=thyroid", { method: "GET" })
      );

      expect(response.status).toBe(200);
      const payload = (await response.json()) as { records: unknown[]; count: number };
      // Should return results matching "thyroid" in filename, tags, or content
      expect(payload.count).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Field-level verification API", () => {
    it("approves a field verification through the route handler", async () => {
      const { POST: approveField } = await import(
        "@/app/api/verification/field/[fieldId]/approve/route"
      );

      const response = await approveField(
        new Request("http://localhost/api/verification/field/field_seed_imaging_1/approve", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reviewer: "test" })
        }),
        { params: { fieldId: "field_seed_imaging_1" } }
      );

      expect(response.status).toBe(200);
      const payload = (await response.json()) as { field?: { verificationStatus: string } };
      expect(payload.field?.verificationStatus).toBe("verified");
    });

    it("rejects a field verification with a note", async () => {
      const { POST: rejectField } = await import(
        "@/app/api/verification/field/[fieldId]/reject/route"
      );

      const response = await rejectField(
        new Request("http://localhost/api/verification/field/field_seed_neuro_1/reject", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reviewer: "test", note: "Value seems incorrect" })
        }),
        { params: { fieldId: "field_seed_neuro_1" } }
      );

      expect(response.status).toBe(200);
      const payload = (await response.json()) as { 
        field?: { verificationStatus: string; reviewerNote?: string } 
      };
      expect(payload.field?.verificationStatus).toBe("rejected");
      expect(payload.field?.reviewerNote).toBe("Value seems incorrect");
    });

    it("returns 404 for unknown field ID", async () => {
      const { POST: approveField } = await import(
        "@/app/api/verification/field/[fieldId]/approve/route"
      );

      const response = await approveField(
        new Request("http://localhost/api/verification/field/nonexistent_field/approve", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reviewer: "test" })
        }),
        { params: { fieldId: "nonexistent_field" } }
      );

      expect(response.status).toBe(404);
    });

    it("returns 400 for invalid payload", async () => {
      const { POST: approveField } = await import(
        "@/app/api/verification/field/[fieldId]/approve/route"
      );

      // Test with invalid type for reviewer (array instead of string)
      const response = await approveField(
        new Request("http://localhost/api/verification/field/some_field/approve", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reviewer: ["invalid_type"], note: 12345 }) // Wrong types
        }),
        { params: { fieldId: "some_field" } }
      );

      expect(response.status).toBe(400);
    });
  });

  describe("Verification task enrichment", () => {
    it("lists verification tasks with status", async () => {
      const { listVerificationTasks } = await import("@/lib/repositories/runtime");

      const tasks = await listVerificationTasks();
      
      expect(Array.isArray(tasks)).toBe(true);
      for (const task of tasks) {
        expect(["pending", "approved", "rejected"]).toContain(task.status);
        expect(task.documentId).toBeDefined();
        expect(task.reason).toBeDefined();
      }
    });
  });

  describe("Record filters store layer", () => {
    it("filters by verification status in store", async () => {
      const { listRecords } = await import("@/lib/repositories/store");

      const verifiedRecords = listRecords({ status: "verified" });
      const pendingRecords = listRecords({ status: "pending" });

      for (const record of verifiedRecords) {
        expect(record.verificationStatus).toBe("verified");
      }

      for (const record of pendingRecords) {
        expect(record.verificationStatus).toBe("pending");
      }
    });

    it("combines status with other filters", async () => {
      const { listRecords } = await import("@/lib/repositories/store");

      const results = listRecords({ 
        status: "verified", 
        type: "summary" 
      });

      for (const record of results) {
        expect(record.verificationStatus).toBe("verified");
        expect(record.type).toBe("summary");
      }
    });
  });
});
