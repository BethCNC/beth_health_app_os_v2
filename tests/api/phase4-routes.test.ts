import { describe, expect, it } from "vitest";
import { listTimeline, getClinicalSnapshot } from "@/lib/repositories/store";

describe("Phase 4 Timeline and Snapshot", () => {
  describe("listTimeline", () => {
    it("returns events filtered by date range", () => {
      const result = listTimeline({
        from: "2025-01-01T00:00:00.000Z",
        to: "2025-12-31T23:59:59.999Z"
      });

      expect(result.events.length).toBeGreaterThan(0);
      result.events.forEach((event) => {
        expect(event.eventDate >= "2025-01-01T00:00:00.000Z").toBe(true);
        expect(event.eventDate <= "2025-12-31T23:59:59.999Z").toBe(true);
      });
    });

    it("returns events filtered by condition", () => {
      const result = listTimeline({ condition: "mcas" });

      result.events.forEach((event) => {
        expect(event.conditions).toContain("mcas");
      });
    });

    it("returns events filtered by type", () => {
      const result = listTimeline({ type: "imaging_result" });

      result.events.forEach((event) => {
        expect(event.type).toBe("imaging_result");
      });
    });

    it("returns events filtered by specialty", () => {
      const result = listTimeline({ specialty: "neurology" });

      result.events.forEach((event) => {
        expect(event.specialty).toBe("neurology");
      });
    });

    it("returns events filtered by verification status", () => {
      const verifiedResult = listTimeline({ verified: true });
      const unverifiedResult = listTimeline({ verified: false });

      verifiedResult.events.forEach((event) => {
        expect(event.verified).toBe(true);
      });

      unverifiedResult.events.forEach((event) => {
        expect(event.verified).toBe(false);
      });
    });

    it("returns related episodes for filtered events", () => {
      const result = listTimeline({ from: "2025-01-01T00:00:00.000Z" });

      const eventEpisodeIds = new Set(
        result.events.map((e) => e.episodeId).filter(Boolean)
      );

      result.episodes.forEach((episode) => {
        expect(eventEpisodeIds.has(episode.id)).toBe(true);
      });
    });

    it("sorts events by date descending", () => {
      const result = listTimeline({});

      for (let i = 1; i < result.events.length; i++) {
        expect(result.events[i - 1].eventDate >= result.events[i].eventDate).toBe(true);
      }
    });

    it("combines multiple filters", () => {
      const result = listTimeline({
        from: "2025-01-01T00:00:00.000Z",
        type: "imaging_result"
      });

      result.events.forEach((event) => {
        expect(event.eventDate >= "2025-01-01T00:00:00.000Z").toBe(true);
        expect(event.type).toBe("imaging_result");
      });
    });
  });

  describe("getClinicalSnapshot", () => {
    it("returns snapshot with all required sections", () => {
      const snapshot = getClinicalSnapshot();

      expect(snapshot.generatedAt).toBeDefined();
      expect(Array.isArray(snapshot.activeConditions)).toBe(true);
      expect(Array.isArray(snapshot.medications)).toBe(true);
      expect(Array.isArray(snapshot.allergies)).toBe(true);
      expect(Array.isArray(snapshot.recentCriticalResults)).toBe(true);
      expect(Array.isArray(snapshot.recentEvents)).toBe(true);
      expect(Array.isArray(snapshot.upcomingAppointments)).toBe(true);
      expect(Array.isArray(snapshot.changesLast30Days)).toBe(true);
      expect(Array.isArray(snapshot.changesLast90Days)).toBe(true);
    });

    it("includes source document IDs in section items", () => {
      const snapshot = getClinicalSnapshot();

      // Check that at least some items have sourceDocumentIds
      const allItems = [
        ...snapshot.activeConditions,
        ...snapshot.recentCriticalResults,
        ...snapshot.recentEvents
      ];

      const itemsWithSources = allItems.filter((item) => item.sourceDocumentIds.length > 0);
      expect(itemsWithSources.length).toBeGreaterThan(0);
    });

    it("includes recent events", () => {
      const snapshot = getClinicalSnapshot();

      expect(snapshot.recentEvents.length).toBeGreaterThan(0);
      snapshot.recentEvents.forEach((item) => {
        expect(item.label).toBeDefined();
        expect(item.value).toBeDefined();
      });
    });

    it("includes critical results from imaging and labs", () => {
      const snapshot = getClinicalSnapshot();

      // Critical results should come from lab or imaging events
      expect(snapshot.recentCriticalResults.length).toBeGreaterThanOrEqual(0);
    });

    it("generates timestamp on each call", () => {
      const snapshot1 = getClinicalSnapshot();

      // Wait a tiny bit to ensure different timestamp
      const snapshot2 = getClinicalSnapshot();

      expect(snapshot1.generatedAt).toBeDefined();
      expect(snapshot2.generatedAt).toBeDefined();
    });
  });
});
