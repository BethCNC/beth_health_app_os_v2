import { describe, expect, it } from "vitest";
import { normalizeDocumentToEvent, normalizeDocumentsToEvents, mergeEvents } from "@/lib/services/event-normalization";
import type { DocumentRecord, ClinicalEvent } from "@/lib/types/domain";

const createMockDocument = (overrides: Partial<DocumentRecord> = {}): DocumentRecord => ({
  id: "doc_test_1",
  sourcePath: "/Health/2025/test.pdf",
  sourceSystem: "google_drive",
  fileName: "test_document.pdf",
  year: 2025,
  specialty: "primary_care",
  type: "lab_panel",
  eventDate: "2025-03-15T00:00:00.000Z",
  tags: [],
  verificationStatus: "pending",
  createdAt: "2025-03-15T10:00:00.000Z",
  updatedAt: "2025-03-15T10:00:00.000Z",
  ...overrides
});

describe("event-normalization", () => {
  describe("normalizeDocumentToEvent", () => {
    it("creates event from lab document", () => {
      const doc = createMockDocument({ type: "lab_panel", specialty: "primary_care" });
      const event = normalizeDocumentToEvent(doc);

      expect(event.id).toMatch(/^event_/);
      expect(event.type).toBe("lab_result");
      expect(event.eventDate).toBe(doc.eventDate);
      expect(event.documentIds).toContain(doc.id);
      expect(event.verified).toBe(false);
    });

    it("creates event from imaging document", () => {
      const doc = createMockDocument({ type: "imaging_mri", specialty: "neurology" });
      const event = normalizeDocumentToEvent(doc);

      expect(event.type).toBe("imaging_result");
      expect(event.title).toContain("Neurology");
    });

    it("creates event from appointment note", () => {
      const doc = createMockDocument({ type: "office_visit" });
      const event = normalizeDocumentToEvent(doc);

      expect(event.type).toBe("appointment");
    });

    it("extracts conditions from tags", () => {
      const doc = createMockDocument({
        tags: ["MCAS", "thyroid panel", "followup"]
      });
      const event = normalizeDocumentToEvent(doc);

      expect(event.conditions).toContain("mcas");
      expect(event.conditions).toContain("thyroid");
    });

    it("marks event as verified when document is verified", () => {
      const doc = createMockDocument({ verificationStatus: "verified" });
      const event = normalizeDocumentToEvent(doc);

      expect(event.verified).toBe(true);
    });

    it("uses createdAt when eventDate is missing", () => {
      const doc = createMockDocument({ eventDate: undefined });
      const event = normalizeDocumentToEvent(doc);

      expect(event.eventDate).toBe(doc.createdAt);
    });
  });

  describe("normalizeDocumentsToEvents", () => {
    it("groups documents by date and specialty", () => {
      const docs = [
        createMockDocument({ id: "doc_1", eventDate: "2025-03-15T00:00:00.000Z", specialty: "neurology" }),
        createMockDocument({ id: "doc_2", eventDate: "2025-03-15T00:00:00.000Z", specialty: "neurology" }),
        createMockDocument({ id: "doc_3", eventDate: "2025-03-16T00:00:00.000Z", specialty: "neurology" })
      ];

      const events = normalizeDocumentsToEvents(docs);

      expect(events.length).toBe(2);
      const groupedEvent = events.find((e) => e.documentIds.length === 2);
      expect(groupedEvent).toBeDefined();
      expect(groupedEvent?.documentIds).toContain("doc_1");
      expect(groupedEvent?.documentIds).toContain("doc_2");
    });

    it("creates separate events for different specialties on same day", () => {
      const docs = [
        createMockDocument({ id: "doc_1", eventDate: "2025-03-15T00:00:00.000Z", specialty: "neurology" }),
        createMockDocument({ id: "doc_2", eventDate: "2025-03-15T00:00:00.000Z", specialty: "cardiology" })
      ];

      const events = normalizeDocumentsToEvents(docs);

      expect(events.length).toBe(2);
    });

    it("sorts events by date descending", () => {
      const docs = [
        createMockDocument({ id: "doc_1", eventDate: "2025-03-10T00:00:00.000Z" }),
        createMockDocument({ id: "doc_2", eventDate: "2025-03-20T00:00:00.000Z" }),
        createMockDocument({ id: "doc_3", eventDate: "2025-03-15T00:00:00.000Z" })
      ];

      const events = normalizeDocumentsToEvents(docs);

      expect(events[0].eventDate).toBe("2025-03-20T00:00:00.000Z");
      expect(events[2].eventDate).toBe("2025-03-10T00:00:00.000Z");
    });

    it("returns empty array for no documents", () => {
      const events = normalizeDocumentsToEvents([]);
      expect(events).toEqual([]);
    });
  });

  describe("mergeEvents", () => {
    const createMockEvent = (id: string, docIds: string[]): ClinicalEvent => ({
      id,
      eventDate: "2025-03-15T00:00:00.000Z",
      title: "Test Event",
      summary: "Test summary",
      type: "lab_result",
      specialty: "primary_care",
      documentIds: docIds,
      conditions: [],
      verified: false
    });

    it("merges non-overlapping events", () => {
      const existing = [createMockEvent("event_1", ["doc_1"])];
      const newEvents = [createMockEvent("event_2", ["doc_2"])];

      const merged = mergeEvents(existing, newEvents);

      expect(merged.length).toBe(2);
    });

    it("skips events with overlapping document IDs", () => {
      const existing = [createMockEvent("event_1", ["doc_1", "doc_2"])];
      const newEvents = [createMockEvent("event_2", ["doc_2", "doc_3"])];

      const merged = mergeEvents(existing, newEvents);

      expect(merged.length).toBe(1);
      expect(merged[0].id).toBe("event_1");
    });

    it("sorts merged events by date descending", () => {
      const existing = [{ ...createMockEvent("event_1", ["doc_1"]), eventDate: "2025-03-10T00:00:00.000Z" }];
      const newEvents = [{ ...createMockEvent("event_2", ["doc_2"]), eventDate: "2025-03-20T00:00:00.000Z" }];

      const merged = mergeEvents(existing, newEvents);

      expect(merged[0].eventDate).toBe("2025-03-20T00:00:00.000Z");
    });
  });
});
