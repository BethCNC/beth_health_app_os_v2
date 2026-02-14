/**
 * Episode Grouping Service
 *
 * Groups ClinicalEvents into ClinicalEpisodes based on temporal proximity
 * and condition focus. Episodes represent related clinical activity windows
 * (e.g., a flare workup, a diagnostic investigation, or treatment course).
 */

import type { ClinicalEpisode, ClinicalEvent } from "@/lib/types/domain";
import { createId } from "@/lib/utils/ids";

/**
 * Configuration for episode grouping
 */
interface EpisodeGroupingConfig {
  /** Maximum days between events to be in same episode */
  maxGapDays: number;
  /** Minimum events required to form an episode */
  minEventsForEpisode: number;
  /** Whether to group by condition overlap */
  groupByCondition: boolean;
}

const DEFAULT_CONFIG: EpisodeGroupingConfig = {
  maxGapDays: 30,
  minEventsForEpisode: 1,
  groupByCondition: true
};

/**
 * Calculates the number of days between two ISO date strings
 */
function daysBetween(dateA: string, dateB: string): number {
  const a = new Date(dateA);
  const b = new Date(dateB);
  const diffMs = Math.abs(a.getTime() - b.getTime());
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Determines severity based on event count and types
 */
function determineSeverity(events: ClinicalEvent[]): "mild" | "moderate" | "severe" {
  const hasImaging = events.some((e) => e.type === "imaging_result");
  const hasMultipleAppointments = events.filter((e) => e.type === "appointment").length >= 2;
  const hasProcedure = events.some((e) => e.type === "procedure");

  if (hasProcedure || (hasImaging && events.length >= 4)) {
    return "severe";
  }

  if (hasImaging || hasMultipleAppointments || events.length >= 3) {
    return "moderate";
  }

  return "mild";
}

/**
 * Generates a label for an episode based on its events
 */
function generateEpisodeLabel(events: ClinicalEvent[], conditions: string[]): string {
  if (conditions.length === 0) {
    const specialties = [...new Set(events.map((e) => e.specialty))];
    if (specialties.length === 1) {
      const specialty = specialties[0].replace(/_/g, " ");
      return `${specialty.charAt(0).toUpperCase() + specialty.slice(1)} workup`;
    }
    return "Multi-specialty assessment";
  }

  const conditionStr = conditions
    .slice(0, 2)
    .map((c) => c.toUpperCase())
    .join("/");

  const hasImaging = events.some((e) => e.type === "imaging_result");
  const hasLabs = events.some((e) => e.type === "lab_result");

  if (hasImaging && hasLabs) {
    return `${conditionStr} comprehensive workup`;
  } else if (hasImaging) {
    return `${conditionStr} imaging investigation`;
  } else if (hasLabs) {
    return `${conditionStr} lab monitoring`;
  }

  return `${conditionStr} clinical episode`;
}

/**
 * Checks if two events share any conditions
 */
function hasConditionOverlap(eventA: ClinicalEvent, eventB: ClinicalEvent): boolean {
  if (eventA.conditions.length === 0 || eventB.conditions.length === 0) {
    // If either has no conditions, fall back to specialty match
    return eventA.specialty === eventB.specialty;
  }

  return eventA.conditions.some((c) => eventB.conditions.includes(c));
}

/**
 * Groups events into episodes based on temporal proximity and condition overlap
 */
export function groupEventsIntoEpisodes(
  events: ClinicalEvent[],
  config: Partial<EpisodeGroupingConfig> = {}
): ClinicalEpisode[] {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  if (events.length === 0) {
    return [];
  }

  // Sort events by date ascending for grouping
  const sortedEvents = [...events].sort((a, b) => a.eventDate.localeCompare(b.eventDate));

  const episodes: ClinicalEpisode[] = [];
  const assignedEventIds = new Set<string>();

  // Process each event
  for (const event of sortedEvents) {
    if (assignedEventIds.has(event.id)) {
      continue;
    }

    // Start a new episode with this event
    const episodeEvents: ClinicalEvent[] = [event];
    assignedEventIds.add(event.id);

    // Find related events within time window
    for (const candidate of sortedEvents) {
      if (assignedEventIds.has(candidate.id)) {
        continue;
      }

      // Check if candidate is within time window of any episode event
      const isInTimeWindow = episodeEvents.some((e) => daysBetween(e.eventDate, candidate.eventDate) <= cfg.maxGapDays);

      if (!isInTimeWindow) {
        continue;
      }

      // If grouping by condition, check for overlap
      if (cfg.groupByCondition) {
        const hasOverlap = episodeEvents.some((e) => hasConditionOverlap(e, candidate));
        if (!hasOverlap) {
          continue;
        }
      }

      episodeEvents.push(candidate);
      assignedEventIds.add(candidate.id);
    }

    // Only create episode if we have enough events
    if (episodeEvents.length >= cfg.minEventsForEpisode) {
      // Sort episode events by date
      episodeEvents.sort((a, b) => a.eventDate.localeCompare(b.eventDate));

      // Collect all conditions
      const allConditions = new Set<string>();
      for (const e of episodeEvents) {
        for (const c of e.conditions) {
          allConditions.add(c);
        }
      }

      const conditionFocus = Array.from(allConditions);
      const startDate = episodeEvents[0].eventDate;
      const endDate = episodeEvents.length > 1 ? episodeEvents[episodeEvents.length - 1].eventDate : undefined;

      episodes.push({
        id: createId("episode"),
        label: generateEpisodeLabel(episodeEvents, conditionFocus),
        startDate,
        endDate,
        conditionFocus,
        eventIds: episodeEvents.map((e) => e.id),
        severity: determineSeverity(episodeEvents)
      });
    }
  }

  // Sort episodes by start date descending
  episodes.sort((a, b) => b.startDate.localeCompare(a.startDate));

  return episodes;
}

/**
 * Assigns events to existing episodes where appropriate
 */
export function assignEventsToEpisodes(
  events: ClinicalEvent[],
  existingEpisodes: ClinicalEpisode[],
  config: Partial<EpisodeGroupingConfig> = {}
): { events: ClinicalEvent[]; episodes: ClinicalEpisode[] } {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  const updatedEpisodes = existingEpisodes.map((ep) => ({ ...ep, eventIds: [...ep.eventIds] }));
  const updatedEvents = events.map((event) => ({ ...event }));

  for (const event of updatedEvents) {
    if (event.episodeId) {
      continue; // Already assigned
    }

    // Find matching episode
    for (const episode of updatedEpisodes) {
      const withinTimeWindow =
        event.eventDate >= episode.startDate &&
        (!episode.endDate || daysBetween(event.eventDate, episode.endDate) <= cfg.maxGapDays);

      if (!withinTimeWindow) {
        continue;
      }

      // Check condition overlap
      if (cfg.groupByCondition) {
        const hasOverlap = event.conditions.some((c) => episode.conditionFocus.includes(c));
        if (!hasOverlap && event.conditions.length > 0) {
          continue;
        }
      }

      // Assign to episode
      event.episodeId = episode.id;
      if (!episode.eventIds.includes(event.id)) {
        episode.eventIds.push(event.id);
      }

      // Extend episode end date if needed
      if (!episode.endDate || event.eventDate > episode.endDate) {
        episode.endDate = event.eventDate;
      }

      break;
    }
  }

  return { events: updatedEvents, episodes: updatedEpisodes };
}

/**
 * Recalculates episode metadata (severity, label) based on current events
 */
export function recalculateEpisode(episode: ClinicalEpisode, events: ClinicalEvent[]): ClinicalEpisode {
  const episodeEvents = events.filter((e) => episode.eventIds.includes(e.id));

  if (episodeEvents.length === 0) {
    return episode;
  }

  const allConditions = new Set<string>();
  for (const e of episodeEvents) {
    for (const c of e.conditions) {
      allConditions.add(c);
    }
  }

  const conditionFocus = Array.from(allConditions);

  return {
    ...episode,
    conditionFocus,
    severity: determineSeverity(episodeEvents),
    label: generateEpisodeLabel(episodeEvents, conditionFocus)
  };
}
