/**
 * Event Normalization Service
 *
 * Derives ClinicalEvent entities from DocumentRecord data.
 * Events represent discrete clinical occurrences that can be placed on a timeline.
 */

import type { ClinicalEvent, DocumentRecord, EventType } from "@/lib/types/domain";
import { createId } from "@/lib/utils/ids";

/**
 * Maps document types to event types
 */
function mapDocumentTypeToEventType(doc: DocumentRecord): EventType {
  switch (doc.type) {
    case "lab_panel":
    case "lab_single":
    case "pathology":
    case "genetic_test":
      return "lab_result";
    case "imaging_mri":
    case "imaging_ct":
    case "imaging_xray":
    case "imaging_ultrasound":
    case "imaging_other":
      return "imaging_result";
    case "office_visit":
    case "consult_note":
    case "hospital_note":
      return "appointment";
    case "procedure_note":
      return "procedure";
    default:
      return "note";
  }
}

/**
 * Generates a title for an event based on document metadata
 */
function generateEventTitle(doc: DocumentRecord): string {
  const specialty = doc.specialty?.replace(/_/g, " ") ?? "General";
  const capitalizedSpecialty = specialty.charAt(0).toUpperCase() + specialty.slice(1);

  switch (doc.type) {
    case "lab_panel":
    case "lab_single":
      return `${capitalizedSpecialty} lab results`;
    case "pathology":
      return `${capitalizedSpecialty} pathology report`;
    case "genetic_test":
      return `Genetic test results`;
    case "imaging_mri":
      return `${capitalizedSpecialty} MRI`;
    case "imaging_ct":
      return `${capitalizedSpecialty} CT scan`;
    case "imaging_xray":
      return `${capitalizedSpecialty} X-ray`;
    case "imaging_ultrasound":
      return `${capitalizedSpecialty} ultrasound`;
    case "imaging_other":
      return `${capitalizedSpecialty} imaging`;
    case "office_visit":
      return `${capitalizedSpecialty} appointment`;
    case "consult_note":
      return `${capitalizedSpecialty} consultation`;
    case "procedure_note":
      return `${capitalizedSpecialty} procedure`;
    case "hospital_note":
      return `${capitalizedSpecialty} hospital visit`;
    case "after_visit_summary":
      return `${capitalizedSpecialty} visit summary`;
    case "referral":
      return `${capitalizedSpecialty} referral`;
    case "provider_letter":
    case "patient_letter":
      return `${capitalizedSpecialty} correspondence`;
    default:
      return `${capitalizedSpecialty} record`;
  }
}

/**
 * Generates a summary description for an event
 */
function generateEventSummary(doc: DocumentRecord): string {
  const preview = doc.textPreview?.slice(0, 150) ?? "";
  const truncatedPreview = preview.length > 0 ? `${preview}...` : "";

  const dateStr = doc.eventDate
    ? new Date(doc.eventDate).toLocaleDateString()
    : new Date(doc.createdAt).toLocaleDateString();

  const parts: string[] = [];

  if (doc.provider) {
    parts.push(`Provider: ${doc.provider}`);
  }

  parts.push(`Date: ${dateStr}`);

  if (doc.tags.length > 0) {
    parts.push(`Tags: ${doc.tags.slice(0, 3).join(", ")}`);
  }

  if (truncatedPreview) {
    parts.push(truncatedPreview);
  }

  return parts.join(". ");
}

/**
 * Extracts condition tags from document metadata
 */
function extractConditions(doc: DocumentRecord): string[] {
  const conditionKeywords = [
    "mcas",
    "thyroid",
    "autoimmune",
    "eds",
    "pots",
    "neurology",
    "vascular",
    "tos",
    "cardiac",
    "gastro",
    "rheumatology",
    "immunology"
  ];

  const conditions: string[] = [];

  // Check tags
  for (const tag of doc.tags) {
    const lowerTag = tag.toLowerCase();
    for (const keyword of conditionKeywords) {
      if (lowerTag.includes(keyword) && !conditions.includes(keyword)) {
        conditions.push(keyword);
      }
    }
  }

  // Check specialty
  const lowerSpecialty = doc.specialty?.toLowerCase() ?? "";
  for (const keyword of conditionKeywords) {
    if (lowerSpecialty.includes(keyword) && !conditions.includes(keyword)) {
      conditions.push(keyword);
    }
  }

  // Check filename
  const lowerFileName = doc.fileName.toLowerCase();
  for (const keyword of conditionKeywords) {
    if (lowerFileName.includes(keyword) && !conditions.includes(keyword)) {
      conditions.push(keyword);
    }
  }

  return conditions;
}

/**
 * Normalizes a single document into a ClinicalEvent
 */
export function normalizeDocumentToEvent(doc: DocumentRecord): ClinicalEvent {
  return {
    id: createId("event"),
    eventDate: doc.eventDate ?? doc.createdAt,
    title: generateEventTitle(doc),
    summary: generateEventSummary(doc),
    type: mapDocumentTypeToEventType(doc),
    specialty: doc.specialty ?? "general",
    documentIds: [doc.id],
    conditions: extractConditions(doc),
    verified: doc.verificationStatus === "verified"
  };
}

/**
 * Normalizes multiple documents into ClinicalEvents.
 * Groups documents by the same date and specialty into single events.
 */
export function normalizeDocumentsToEvents(documents: DocumentRecord[]): ClinicalEvent[] {
  // Group documents by date (day) and specialty
  const groups = new Map<string, DocumentRecord[]>();

  for (const doc of documents) {
    const eventDate = doc.eventDate ?? doc.createdAt;
    const dateKey = eventDate.slice(0, 10); // YYYY-MM-DD
    const specialty = doc.specialty ?? "general";
    const groupKey = `${dateKey}|${specialty}`;

    const existing = groups.get(groupKey) ?? [];
    existing.push(doc);
    groups.set(groupKey, existing);
  }

  const events: ClinicalEvent[] = [];

  for (const [, docs] of groups) {
    if (docs.length === 1) {
      // Single document - create simple event
      events.push(normalizeDocumentToEvent(docs[0]));
    } else {
      // Multiple documents on same day/specialty - create grouped event
      const firstDoc = docs[0];
      const allConditions = new Set<string>();
      const allDocIds: string[] = [];
      const allVerified = docs.every((d) => d.verificationStatus === "verified");

      for (const doc of docs) {
        allDocIds.push(doc.id);
        for (const condition of extractConditions(doc)) {
          allConditions.add(condition);
        }
      }

      const specialty = firstDoc.specialty?.replace(/_/g, " ") ?? "General";
      const capitalizedSpecialty = specialty.charAt(0).toUpperCase() + specialty.slice(1);

      events.push({
        id: createId("event"),
        eventDate: firstDoc.eventDate ?? firstDoc.createdAt,
        title: `${capitalizedSpecialty} records (${docs.length} documents)`,
        summary: `Multiple ${capitalizedSpecialty.toLowerCase()} records from this date.`,
        type: mapDocumentTypeToEventType(firstDoc),
        specialty: firstDoc.specialty ?? "general",
        documentIds: allDocIds,
        conditions: Array.from(allConditions),
        verified: allVerified
      });
    }
  }

  // Sort by date descending
  events.sort((a, b) => b.eventDate.localeCompare(a.eventDate));

  return events;
}

/**
 * Merges new events with existing events, avoiding duplicates based on documentIds
 */
export function mergeEvents(existing: ClinicalEvent[], newEvents: ClinicalEvent[]): ClinicalEvent[] {
  const existingDocIds = new Set<string>();

  for (const event of existing) {
    for (const docId of event.documentIds) {
      existingDocIds.add(docId);
    }
  }

  const merged = [...existing];

  for (const newEvent of newEvents) {
    // Check if any of this event's documents are already covered
    const hasOverlap = newEvent.documentIds.some((id) => existingDocIds.has(id));

    if (!hasOverlap) {
      merged.push(newEvent);
      for (const docId of newEvent.documentIds) {
        existingDocIds.add(docId);
      }
    }
  }

  // Sort by date descending
  merged.sort((a, b) => b.eventDate.localeCompare(a.eventDate));

  return merged;
}
