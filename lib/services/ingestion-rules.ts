import type { DocumentType } from "@/lib/types/domain";

const IGNORED_FILE_NAMES = new Set([".DS_Store"]);

const SPECIALTY_MAP: Record<string, string> = {
  gp: "primary_care",
  gastro: "gastroenterology",
  gi: "gastroenterology",
  mcas: "immunology_mcas",
  endocrinology: "endocrinology",
  rheumatology: "rheumatology",
  cardiology: "cardiology",
  neurology: "neurology",
  vascular: "vascular",
  psych: "psychiatry",
  eye: "ophthalmology",
  gyno: "gynecology",
  spinal: "spine",
  "orthopedic surgeon": "orthopedic",
  orthepedic: "orthopedic",
  "hand doc": "hand_specialist"
};

export interface ParsedDrivePath {
  year: number;
  specialty: string;
  subfolders: string[];
  fileName: string;
}

export function shouldIngestFile(filePath: string): { allowed: boolean; reason?: string } {
  const fileName = filePath.split("/").pop() ?? filePath;
  if (IGNORED_FILE_NAMES.has(fileName)) {
    return { allowed: false, reason: "ignored_system_file" };
  }

  if (!fileName.toLowerCase().endsWith(".pdf")) {
    return { allowed: false, reason: "unsupported_file_type" };
  }

  return { allowed: true };
}

export function parseDrivePath(filePath: string): ParsedDrivePath | null {
  const segments = filePath.split("/").filter(Boolean);
  const yearIndex = segments.findIndex((segment) => /^20\d{2}$/.test(segment));
  if (yearIndex < 0 || yearIndex + 2 >= segments.length) {
    return null;
  }

  const year = Number(segments[yearIndex]);
  const specialtyRaw = segments[yearIndex + 1];
  const fileName = segments[segments.length - 1];
  const subfolders = segments.slice(yearIndex + 2, segments.length - 1);

  return {
    year,
    specialty: normalizeSpecialty(specialtyRaw),
    subfolders,
    fileName
  };
}

export function normalizeSpecialty(specialtyRaw: string): string {
  const key = specialtyRaw.trim().toLowerCase();
  return SPECIALTY_MAP[key] ?? key.replace(/\s+/g, "_");
}

export function classifyDocumentType(fileName: string): DocumentType {
  const lower = fileName.toLowerCase();

  // Labs - check for panel vs single
  if (/(comprehensive.*panel|metabolic.*panel|cbc|lipid.*panel|panel)/.test(lower)) {
    return "lab_panel";
  }
  if (/(lab|test details|result trends|antibod|tsh|t4)/.test(lower)) {
    return "lab_single";
  }
  if (/biopsy|pathology|cytology|histology/.test(lower)) {
    return "pathology";
  }
  if (/genetic|genomic|dna/.test(lower)) {
    return "genetic_test";
  }
  // Imaging - specific types
  if (/mri|magnetic resonance/.test(lower)) {
    return "imaging_mri";
  }
  if (/\bct\b|cat scan|computed tomography/.test(lower)) {
    return "imaging_ct";
  }
  if (/xray|x-ray|radiograph/.test(lower)) {
    return "imaging_xray";
  }
  if (/ultrasound|sonogram/.test(lower)) {
    return "imaging_ultrasound";
  }
  if (/(angiogram|emg|contrast|radiology|imaging|echocardiogram|echo)/.test(lower)) {
    return "imaging_other";
  }
  // Clinical notes
  if (/(consult|consultation)/.test(lower)) {
    return "consult_note";
  }
  if (/(colonoscopy|endoscopy|procedure|injection)/.test(lower)) {
    return "procedure_note";
  }
  if (/(after.?visit.?summary|avs)/.test(lower)) {
    return "after_visit_summary";
  }
  if (/(appt|appointment|visit|clinical notes|follow-up|follow up|cardiologist|office)/.test(lower)) {
    return "office_visit";
  }
  // Communications
  if (/referral/.test(lower)) {
    return "referral";
  }
  if (/letter/.test(lower)) {
    return "provider_letter";
  }

  return "unknown";
}

export function extractEventDate(fileName: string): string | undefined {
  const lower = fileName.toLowerCase();

  const monthNameRegex =
    /(jan|january|feb|february|mar|march|apr|april|may|jun|june|jul|july|aug|august|sep|sept|september|oct|october|nov|november|dec|december)[-_\s,.]*(\d{1,2})[-_\s,.]*(20\d{2})/i;
  const monthNameMatch = lower.match(monthNameRegex);
  if (monthNameMatch) {
    const monthMap: Record<string, number> = {
      jan: 0,
      january: 0,
      feb: 1,
      february: 1,
      mar: 2,
      march: 2,
      apr: 3,
      april: 3,
      may: 4,
      jun: 5,
      june: 5,
      jul: 6,
      july: 6,
      aug: 7,
      august: 7,
      sep: 8,
      sept: 8,
      september: 8,
      oct: 9,
      october: 9,
      nov: 10,
      november: 10,
      dec: 11,
      december: 11
    };
    const month = monthMap[monthNameMatch[1]];
    const day = Number(monthNameMatch[2]);
    const year = Number(monthNameMatch[3]);
    if (month !== undefined) {
      return new Date(Date.UTC(year, month, day)).toISOString();
    }
  }

  const numericDateRegex = /(\d{1,2})[_-](\d{1,2})[_-](20\d{2})/;
  const numericMatch = lower.match(numericDateRegex);
  if (numericMatch) {
    const month = Number(numericMatch[1]) - 1;
    const day = Number(numericMatch[2]);
    const year = Number(numericMatch[3]);
    return new Date(Date.UTC(year, month, day)).toISOString();
  }

  return undefined;
}

export function createDocumentFingerprint(filePath: string): string {
  const normalized = filePath
    .toLowerCase()
    .replace(/\([0-9]+\)/g, "")
    .replace(/\.pdf$/i, "")
    .replace(/[^a-z0-9/]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/_\//g, "/")
    .replace(/\/_/g, "/");

  // 2025 GP known duplicate pattern for result trends files.
  return normalized.replace(/result_trends_comprehensive_metabolic_panel_jan_20_2025/g, "cmp_jan_20_2025");
}

export function deriveTags(fileName: string, specialty: string, year: number): string[] {
  const lower = fileName.toLowerCase();
  const tags = new Set<string>([specialty, String(year)]);

  if (/mcas/.test(lower) || specialty === "immunology_mcas") {
    tags.add("mcas");
  }
  if (/thyroid|tsh|t4|tpo|tgab/.test(lower)) {
    tags.add("thyroid");
  }
  if (/mri|ct|radiology|xray|angiogram|emg/.test(lower)) {
    tags.add("imaging");
  }
  if (/lab|panel|cbc|metabolic|antibod|result trends/.test(lower)) {
    tags.add("lab");
  }
  if (/biopsy|endoscopy|colonoscopy/.test(lower)) {
    tags.add("procedure");
  }
  if (/letter/.test(lower)) {
    tags.add("letter");
  }

  return [...tags];
}
