import type { DocumentRecord, ExtractedEntityType } from "@/lib/types/domain";
import type { TextChunk } from "@/lib/services/text-chunker";

export interface ExtractionCandidate {
  type: ExtractedEntityType;
  label: string;
  value: string;
  confidence: number;
  sourceChunkIndexes: number[];
  fieldKey: string;
  valueType: "string" | "number" | "date" | "boolean" | "json";
}

const DIAGNOSIS_KEYWORDS = [
  "mcas",
  "thyroid",
  "thoracic outlet",
  "autoimmune",
  "rheumatoid",
  "dysautonomia",
  "neuropathy"
];

const LAB_MARKERS = ["tsh", "t4", "cbc", "creatinine", "metabolic panel", "c-reactive", "rheumatoid factor"];

const PROCEDURE_MARKERS = ["mri", "ct", "angiogram", "biopsy", "endoscopy", "colonoscopy", "emg"];

export function inferExtractionCandidates(params: {
  document: DocumentRecord;
  fullText: string;
  chunks: TextChunk[];
}): ExtractionCandidate[] {
  const normalizedText = params.fullText.toLowerCase();
  const candidates: ExtractionCandidate[] = [];

  const preview = buildPreview(params.fullText || params.document.fileName);
  candidates.push({
    type: "summary",
    label: "Document summary",
    value: preview,
    confidence: 0.72,
    sourceChunkIndexes: [0],
    fieldKey: "document_summary",
    valueType: "string"
  });

  for (const keyword of DIAGNOSIS_KEYWORDS) {
    if (normalizedText.includes(keyword)) {
      candidates.push({
        type: "diagnosis",
        label: "Condition mention",
        value: keyword,
        confidence: 0.63,
        sourceChunkIndexes: findMatchingChunks(params.chunks, keyword),
        fieldKey: "condition_mention",
        valueType: "string"
      });
    }
  }

  for (const keyword of LAB_MARKERS) {
    if (normalizedText.includes(keyword) || params.document.fileName.toLowerCase().includes(keyword)) {
      candidates.push({
        type: "lab",
        label: "Lab marker",
        value: keyword.toUpperCase(),
        confidence: 0.7,
        sourceChunkIndexes: findMatchingChunks(params.chunks, keyword),
        fieldKey: "lab_marker",
        valueType: "string"
      });
    }
  }

  for (const keyword of PROCEDURE_MARKERS) {
    if (normalizedText.includes(keyword) || params.document.fileName.toLowerCase().includes(keyword)) {
      candidates.push({
        type: "procedure",
        label: "Procedure or imaging",
        value: keyword,
        confidence: 0.74,
        sourceChunkIndexes: findMatchingChunks(params.chunks, keyword),
        fieldKey: "procedure_marker",
        valueType: "string"
      });
    }
  }

  const providerMatches = [...params.fullText.matchAll(/dr\.?\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?/g)].slice(0, 2);
  for (const match of providerMatches) {
    candidates.push({
      type: "provider",
      label: "Provider mention",
      value: match[0],
      confidence: 0.66,
      sourceChunkIndexes: findMatchingChunks(params.chunks, match[0].toLowerCase()),
      fieldKey: "provider_mention",
      valueType: "string"
    });
  }

  const deduped = dedupeCandidates(candidates);
  return deduped.slice(0, 16);
}

function buildPreview(source: string): string {
  return source.replace(/\s+/g, " ").trim().slice(0, 260);
}

function findMatchingChunks(chunks: TextChunk[], keyword: string): number[] {
  const lower = keyword.toLowerCase();
  const matches = chunks.filter((chunk) => chunk.text.toLowerCase().includes(lower)).map((chunk) => chunk.chunkIndex);
  if (matches.length > 0) {
    return matches;
  }
  return chunks.length > 0 ? [0] : [];
}

function dedupeCandidates(candidates: ExtractionCandidate[]): ExtractionCandidate[] {
  const seen = new Set<string>();
  const output: ExtractionCandidate[] = [];

  for (const candidate of candidates) {
    const key = `${candidate.type}|${candidate.value.toLowerCase()}|${candidate.fieldKey}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    output.push(candidate);
  }

  return output;
}
