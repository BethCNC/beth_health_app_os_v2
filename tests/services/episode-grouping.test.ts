import { describe, expect, it } from "vitest";
import { groupEventsIntoEpisodes, assignEventsToEpisodes, recalculateEpisode } from "@/lib/services/episode-grouping";
import type { ClinicalEvent, ClinicalEpisode } from "@/lib/types/domain";

const createMockEvent = (overrides: Partial<ClinicalEvent> = {}): ClinicalEvent => ({
  id: `event_${Math.random().toString(36).slice(2, 8)}`,
  eventDate: "2025-03-15T00:00:00.000Z",
  title: "Test Event",
  summary: "Test summary",
  type: "lab_result",
  specialty: "primary_care",
  documentIds: ["doc_1"],
  conditions: [],
  verified: false,
  ...overrides
});

describe("episode-grouping", () => {
  describe("groupEventsIntoEpisodes", () => {
    it("groups events within 30 days into same episode", () => {
      const events = [
        createMockEvent({ id: "event_1", eventDate: "2025-03-01T00:00:00.000Z", conditions: ["mcas"] }),
        createMockEvent({ id: "event_2", eventDate: "2025-03-15T00:00:00.000Z", conditions: ["mcas"] }),
        createMockEvent({ id: "event_3", eventDate: "2025-03-28T00:00:00.000Z", conditions: ["mcas"] })
      ];

      const episodes = groupEventsIntoEpisodes(events);

      expect(episodes.length).toBe(1);
      expect(episodes[0].eventIds.length).toBe(3);
    });

    it("creates separate episodes for events more than 30 days apart", () => {
      const events = [
        createMockEvent({ id: "event_1", eventDate: "2025-01-15T00:00:00.000Z", conditions: ["mcas"] }),
        createMockEvent({ id: "event_2", eventDate: "2025-05-15T00:00:00.000Z", conditions: ["mcas"] })
      ];

      const episodes = groupEventsIntoEpisodes(events);

      expect(episodes.length).toBe(2);
    });

    it("creates separate episodes for different conditions", () => {
      const events = [
        createMockEvent({ id: "event_1", eventDate: "2025-03-01T00:00:00.000Z", conditions: ["mcas"] }),
        createMockEvent({ id: "event_2", eventDate: "2025-03-05T00:00:00.000Z", conditions: ["thyroid"] })
      ];

      const episodes = groupEventsIntoEpisodes(events);

      expect(episodes.length).toBe(2);
    });

    it("groups events by specialty when no conditions specified", () => {
      const events = [
        createMockEvent({ id: "event_1", eventDate: "2025-03-01T00:00:00.000Z", conditions: [], specialty: "neurology" }),
        createMockEvent({ id: "event_2", eventDate: "2025-03-05T00:00:00.000Z", conditions: [], specialty: "neurology" })
      ];

      const episodes = groupEventsIntoEpisodes(events);

      expect(episodes.length).toBe(1);
    });

    it("determines severity based on event types", () => {
      const mildEvents = [createMockEvent({ type: "note" })];
      const moderateEvents = [
        createMockEvent({ type: "imaging_result" }),
        createMockEvent({ type: "lab_result" })
      ];

      const mildEpisodes = groupEventsIntoEpisodes(mildEvents);
      const moderateEpisodes = groupEventsIntoEpisodes(moderateEvents);

      expect(mildEpisodes[0].severity).toBe("mild");
      expect(moderateEpisodes[0].severity).toBe("moderate");
    });

    it("generates meaningful episode labels", () => {
      const events = [
        createMockEvent({ conditions: ["mcas"], type: "imaging_result" })
      ];

      const episodes = groupEventsIntoEpisodes(events);

      expect(episodes[0].label).toContain("MCAS");
      expect(episodes[0].label).toContain("imaging");
    });

    it("returns empty array for no events", () => {
      const episodes = groupEventsIntoEpisodes([]);
      expect(episodes).toEqual([]);
    });

    it("respects custom maxGapDays config", () => {
      const events = [
        createMockEvent({ id: "event_1", eventDate: "2025-03-01T00:00:00.000Z", conditions: ["mcas"] }),
        createMockEvent({ id: "event_2", eventDate: "2025-03-20T00:00:00.000Z", conditions: ["mcas"] })
      ];

      const episodesDefault = groupEventsIntoEpisodes(events);
      const episodesStrict = groupEventsIntoEpisodes(events, { maxGapDays: 10 });

      expect(episodesDefault.length).toBe(1);
      expect(episodesStrict.length).toBe(2);
    });
  });

  describe("assignEventsToEpisodes", () => {
    it("assigns event to matching episode", () => {
      const events = [
        createMockEvent({ id: "event_new", eventDate: "2025-03-15T00:00:00.000Z", conditions: ["mcas"] })
      ];
      const existingEpisodes: ClinicalEpisode[] = [
        {
          id: "episode_1",
          label: "MCAS workup",
          startDate: "2025-03-01T00:00:00.000Z",
          endDate: "2025-03-20T00:00:00.000Z",
          conditionFocus: ["mcas"],
          eventIds: ["event_old"],
          severity: "moderate"
        }
      ];

      const { events: updatedEvents, episodes: updatedEpisodes } = assignEventsToEpisodes(events, existingEpisodes);

      expect(updatedEvents[0].episodeId).toBe("episode_1");
      expect(updatedEpisodes[0].eventIds).toContain("event_new");
    });

    it("does not assign event outside time window", () => {
      const events = [
        createMockEvent({ id: "event_new", eventDate: "2025-06-15T00:00:00.000Z", conditions: ["mcas"] })
      ];
      const existingEpisodes: ClinicalEpisode[] = [
        {
          id: "episode_1",
          label: "MCAS workup",
          startDate: "2025-03-01T00:00:00.000Z",
          endDate: "2025-03-20T00:00:00.000Z",
          conditionFocus: ["mcas"],
          eventIds: ["event_old"],
          severity: "moderate"
        }
      ];

      const { events: updatedEvents } = assignEventsToEpisodes(events, existingEpisodes);

      expect(updatedEvents[0].episodeId).toBeUndefined();
    });

    it("does not assign event with different conditions", () => {
      const events = [
        createMockEvent({ id: "event_new", eventDate: "2025-03-15T00:00:00.000Z", conditions: ["thyroid"] })
      ];
      const existingEpisodes: ClinicalEpisode[] = [
        {
          id: "episode_1",
          label: "MCAS workup",
          startDate: "2025-03-01T00:00:00.000Z",
          endDate: "2025-03-20T00:00:00.000Z",
          conditionFocus: ["mcas"],
          eventIds: ["event_old"],
          severity: "moderate"
        }
      ];

      const { events: updatedEvents } = assignEventsToEpisodes(events, existingEpisodes);

      expect(updatedEvents[0].episodeId).toBeUndefined();
    });

    it("extends episode end date when event is later", () => {
      const events = [
        createMockEvent({ id: "event_new", eventDate: "2025-03-25T00:00:00.000Z", conditions: ["mcas"] })
      ];
      const existingEpisodes: ClinicalEpisode[] = [
        {
          id: "episode_1",
          label: "MCAS workup",
          startDate: "2025-03-01T00:00:00.000Z",
          endDate: "2025-03-20T00:00:00.000Z",
          conditionFocus: ["mcas"],
          eventIds: ["event_old"],
          severity: "moderate"
        }
      ];

      const { episodes: updatedEpisodes } = assignEventsToEpisodes(events, existingEpisodes);

      expect(updatedEpisodes[0].endDate).toBe("2025-03-25T00:00:00.000Z");
    });
  });

  describe("recalculateEpisode", () => {
    it("updates conditionFocus from events", () => {
      const episode: ClinicalEpisode = {
        id: "episode_1",
        label: "Old label",
        startDate: "2025-03-01T00:00:00.000Z",
        conditionFocus: [],
        eventIds: ["event_1", "event_2"],
        severity: "mild"
      };
      const events: ClinicalEvent[] = [
        createMockEvent({ id: "event_1", conditions: ["mcas"] }),
        createMockEvent({ id: "event_2", conditions: ["thyroid"] })
      ];

      const updated = recalculateEpisode(episode, events);

      expect(updated.conditionFocus).toContain("mcas");
      expect(updated.conditionFocus).toContain("thyroid");
    });

    it("updates severity based on events", () => {
      const episode: ClinicalEpisode = {
        id: "episode_1",
        label: "Test",
        startDate: "2025-03-01T00:00:00.000Z",
        conditionFocus: [],
        eventIds: ["event_1"],
        severity: "mild"
      };
      const events: ClinicalEvent[] = [
        createMockEvent({ id: "event_1", type: "imaging_result" })
      ];

      const updated = recalculateEpisode(episode, events);

      expect(updated.severity).toBe("moderate");
    });

    it("regenerates label based on events", () => {
      const episode: ClinicalEpisode = {
        id: "episode_1",
        label: "Old label",
        startDate: "2025-03-01T00:00:00.000Z",
        conditionFocus: [],
        eventIds: ["event_1"],
        severity: "mild"
      };
      const events: ClinicalEvent[] = [
        createMockEvent({ id: "event_1", conditions: ["mcas"], type: "lab_result" })
      ];

      const updated = recalculateEpisode(episode, events);

      expect(updated.label).toContain("MCAS");
    });
  });
});
