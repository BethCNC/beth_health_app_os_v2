import type { DocumentRecord } from "@/lib/types/domain";

export type ClinicalSystemTag = "immune" | "neuro" | "gi" | "cardio" | "autonomic" | "connective";
export type ClinicalSystemState = "stable" | "reactive" | "monitoring" | "critical";

const SYSTEM_KEYWORDS: Record<ClinicalSystemTag, string[]> = {
  immune: ["immune", "immunology", "mcas", "allergy", "mast", "histamine"],
  neuro: ["neuro", "neurology", "brain", "spine", "headache", "migraine"],
  gi: ["gi", "gastro", "gastroenterology", "motility", "bowel", "digestive"],
  cardio: ["cardio", "cardiology", "vascular", "heart", "bp", "blood pressure"],
  autonomic: ["autonomic", "dysautonomia", "pots", "syncope", "orthostatic", "hr"],
  connective: ["connective", "heds", "ehlers", "ortho", "orthopedic", "rheum", "joint"]
};

function normalizeRecordSearchText(record: Pick<DocumentRecord, "specialty" | "type" | "tags" | "fileName">): string {
  return `${record.specialty} ${record.type} ${record.tags.join(" ")} ${record.fileName}`.toLowerCase();
}

export function deriveSystemTags(record: Pick<DocumentRecord, "specialty" | "type" | "tags" | "fileName">): ClinicalSystemTag[] {
  const text = normalizeRecordSearchText(record);
  const matches: ClinicalSystemTag[] = [];

  for (const [system, keywords] of Object.entries(SYSTEM_KEYWORDS) as Array<[ClinicalSystemTag, string[]]>) {
    if (keywords.some((keyword) => text.includes(keyword))) {
      matches.push(system);
    }
  }

  if (matches.length > 0) {
    return matches;
  }

  return ["connective"];
}

export function formatSystemLabel(system: ClinicalSystemTag): string {
  const labels: Record<ClinicalSystemTag, string> = {
    immune: "Immune",
    neuro: "Neuro",
    gi: "GI",
    cardio: "Cardio",
    autonomic: "Autonomic",
    connective: "Connective"
  };
  return labels[system];
}

export function formatSystemStateLabel(state: ClinicalSystemState): string {
  const labels: Record<ClinicalSystemState, string> = {
    stable: "STABLE",
    reactive: "REACTIVE",
    monitoring: "MONITORING",
    critical: "CRITICAL"
  };
  return labels[state];
}

function recordTimestamp(record: Pick<DocumentRecord, "eventDate" | "createdAt">): number {
  const value = record.eventDate ?? record.createdAt;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

export function deriveSystemState(records: DocumentRecord[], system: ClinicalSystemTag): ClinicalSystemState {
  const latest = [...records]
    .filter((record) => deriveSystemTags(record).includes(system))
    .sort((a, b) => recordTimestamp(b) - recordTimestamp(a))[0];

  if (!latest) {
    return "monitoring";
  }

  const tags = latest.tags.map((tag) => tag.toLowerCase());
  if (tags.some((tag) => ["critical", "acute", "er", "emergency", "flare"].includes(tag))) {
    return "critical";
  }

  if (latest.verificationStatus === "pending") {
    return "reactive";
  }

  return "stable";
}

export function formatClinicalDate(record: Pick<DocumentRecord, "eventDate" | "year">): string {
  if (record.eventDate) {
    return record.eventDate.slice(0, 10);
  }
  return String(record.year);
}
