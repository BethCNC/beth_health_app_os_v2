import { beforeEach, describe, expect, it, vi } from "vitest";

function createFirestoreReadMock() {
  return {
    listImportJobsFromFirestore: vi.fn().mockResolvedValue([]),
    getImportJobByIdFromFirestore: vi.fn().mockResolvedValue(null),
    listRecordsFromFirestore: vi.fn().mockResolvedValue([]),
    getRecordByIdFromFirestore: vi.fn().mockResolvedValue(null),
    listDocumentChunksByDocumentIdFromFirestore: vi.fn().mockResolvedValue([]),
    listExtractedFieldsByDocumentIdFromFirestore: vi.fn().mockResolvedValue([]),
    listExtractedEntitiesByDocumentIdFromFirestore: vi.fn().mockResolvedValue([]),
    listVerificationTasksFromFirestore: vi.fn().mockResolvedValue([]),
    approveVerificationTaskInFirestore: vi.fn().mockResolvedValue(null),
    rejectVerificationTaskInFirestore: vi.fn().mockResolvedValue(null),
    listTimelineFromFirestore: vi.fn().mockResolvedValue({ events: [], episodes: [] }),
    getClinicalSnapshotFromFirestore: vi.fn().mockResolvedValue({
      generatedAt: new Date().toISOString(),
      activeConditions: [],
      medications: [],
      allergies: [],
      recentCriticalResults: [],
      recentEvents: [],
      upcomingAppointments: [],
      changesLast30Days: [],
      changesLast90Days: []
    }),
    getDocumentsByIdsFromFirestore: vi.fn().mockResolvedValue([])
  };
}

describe("runtime repository selection", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("uses in-memory reads when Firestore persistence is unavailable", async () => {
    vi.doMock("@/lib/repositories/firestore-persistence", () => ({
      getFirestorePersistenceStatus: () => ({ enabled: false, reason: "firebase_admin_not_installed" })
    }));

    const runtime = await import("@/lib/repositories/runtime");

    const records = await runtime.listRecords({});
    expect(records.length).toBeGreaterThan(0);
    expect(runtime.getDataStoreStatus().readMode).toBe("in_memory");
  });

  it("falls back to in-memory when Firestore reads throw unexpectedly", async () => {
    const fireReadMock = createFirestoreReadMock();
    fireReadMock.listRecordsFromFirestore.mockRejectedValue(new Error("firestore_unavailable"));

    vi.doMock("@/lib/repositories/firestore-persistence", () => ({
      getFirestorePersistenceStatus: () => ({ enabled: true })
    }));
    vi.doMock("@/lib/repositories/firestore-read", () => fireReadMock);

    const runtime = await import("@/lib/repositories/runtime");

    const records = await runtime.listRecords({});
    expect(records.length).toBeGreaterThan(0);
    expect(runtime.getDataStoreStatus().readMode).toBe("firestore");
  });
});
