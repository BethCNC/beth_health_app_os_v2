export interface ParsedReferenceRange {
  low?: number;
  high?: number;
}

const TEST_NAME_NORMALIZERS: Array<{ pattern: RegExp; canonical: string }> = [
  { pattern: /\b(s[-\s]?tryptase|tryptase(,?\s*serum)?)\b/i, canonical: "Tryptase" },
  { pattern: /\b(c[-\s]?reactive protein|crp)\b/i, canonical: "CRP" },
  { pattern: /\b(esr|sed rate|erythrocyte sedimentation)\b/i, canonical: "ESR" },
  { pattern: /\b(igg)\b/i, canonical: "IgG" },
  { pattern: /\b(iga)\b/i, canonical: "IgA" },
  { pattern: /\b(igm)\b/i, canonical: "IgM" },
  { pattern: /\b(vitamin d|25[-\s]?oh)\b/i, canonical: "Vitamin D 25-OH" },
  { pattern: /\b(ferritin)\b/i, canonical: "Ferritin" },
  { pattern: /\b(cbc|complete blood count)\b/i, canonical: "CBC" }
];

export function normalizeLabTestName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) {
    return "Unknown Test";
  }

  for (const rule of TEST_NAME_NORMALIZERS) {
    if (rule.pattern.test(trimmed)) {
      return rule.canonical;
    }
  }

  return trimmed
    .replace(/\s+/g, " ")
    .replace(/[,_-]+/g, " ")
    .trim();
}

export function extractNumericValue(value: string): number | undefined {
  const match = value.match(/-?\d+(\.\d+)?/);
  if (!match) {
    return undefined;
  }
  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function parseReferenceRange(reference: string): ParsedReferenceRange {
  const normalized = reference.trim().toLowerCase();
  if (!normalized) {
    return {};
  }

  const betweenMatch = normalized.match(/(-?\d+(\.\d+)?)\s*[-to]+\s*(-?\d+(\.\d+)?)/);
  if (betweenMatch) {
    const low = Number(betweenMatch[1]);
    const high = Number(betweenMatch[3]);
    if (Number.isFinite(low) && Number.isFinite(high)) {
      return { low, high };
    }
  }

  const upperMatch = normalized.match(/(<=?|up to|lt)\s*(-?\d+(\.\d+)?)/);
  if (upperMatch) {
    const high = Number(upperMatch[2]);
    if (Number.isFinite(high)) {
      return { high };
    }
  }

  const lowerMatch = normalized.match(/(>=?|at least|gt)\s*(-?\d+(\.\d+)?)/);
  if (lowerMatch) {
    const low = Number(lowerMatch[2]);
    if (Number.isFinite(low)) {
      return { low };
    }
  }

  return {};
}

export function isOutOfRange(value: number | undefined, reference: ParsedReferenceRange): boolean {
  if (value === undefined) {
    return false;
  }
  if (reference.low !== undefined && value < reference.low) {
    return true;
  }
  if (reference.high !== undefined && value > reference.high) {
    return true;
  }
  return false;
}
