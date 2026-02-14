import OpenAI from "openai";
import { extractPdfText } from "@/lib/services/pdf-extractor";
import type { DocumentRecord, ExtractedEntityType } from "@/lib/types/domain";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export interface AIExtractedEntity {
  type: ExtractedEntityType;
  label: string;
  value: string;
  confidence: number;
  context?: string;
}

export interface AIDocumentAnalysis {
  documentId: string;
  fileName: string;
  year: number;
  specialty: string;
  analysisTimestamp: string;

  // Core extracted data
  documentType: string;
  documentDate: string | null;
  provider: string | null;
  facility: string | null;

  // Medical content
  chiefComplaint: string | null;
  diagnoses: AIExtractedEntity[];
  medications: AIExtractedEntity[];
  labResults: AIExtractedEntity[];
  imagingFindings: AIExtractedEntity[];
  procedures: AIExtractedEntity[];
  allergies: AIExtractedEntity[];
  vitalSigns: AIExtractedEntity[];

  // Summary
  summary: string;
  keyFindings: string[];
  followUpRecommendations: string[];

  // Metadata
  confidence: number;
  rawTextLength: number;
  processingTimeMs: number;
  error?: string;
}

export interface YearAnalysisReport {
  year: number;
  analyzedAt: string;
  totalFiles: number;
  successfulAnalyses: number;
  failedAnalyses: number;
  analyses: AIDocumentAnalysis[];
  yearSummary: YearSummary;
}

export interface YearSummary {
  allDiagnoses: string[];
  allMedications: string[];
  specialtiesVisited: string[];
  keyEvents: string[];
  labTrends: { marker: string; values: { date: string; value: string }[] }[];
}

const MEDICAL_EXTRACTION_PROMPT = `You are a medical document analyzer. Extract structured data from this medical document.

IMPORTANT RULES:
1. Only extract information explicitly stated in the document
2. Do not infer or assume information not present
3. Use exact values from the document
4. For dates, use ISO format (YYYY-MM-DD) when possible
5. Confidence should reflect how clearly the information is stated (0.0-1.0)

Return a JSON object with this structure:
{
  "documentType": "lab_result|imaging_report|appointment_note|letter|prescription|procedure_note|referral|other",
  "documentDate": "YYYY-MM-DD or null if unclear",
  "provider": "Dr. Name or null",
  "facility": "Hospital/Clinic name or null",
  "chiefComplaint": "main reason for visit or null",
  "diagnoses": [
    {"type": "diagnosis", "label": "ICD description or condition name", "value": "code if present", "confidence": 0.0-1.0, "context": "relevant quote"}
  ],
  "medications": [
    {"type": "medication", "label": "drug name", "value": "dosage and frequency", "confidence": 0.0-1.0, "context": "relevant quote"}
  ],
  "labResults": [
    {"type": "lab", "label": "test name", "value": "result with units and reference range", "confidence": 0.0-1.0, "context": "relevant quote"}
  ],
  "imagingFindings": [
    {"type": "finding", "label": "imaging type", "value": "finding description", "confidence": 0.0-1.0, "context": "relevant quote"}
  ],
  "procedures": [
    {"type": "procedure", "label": "procedure name", "value": "details", "confidence": 0.0-1.0, "context": "relevant quote"}
  ],
  "allergies": [
    {"type": "allergy", "label": "allergen", "value": "reaction type", "confidence": 0.0-1.0}
  ],
  "vitalSigns": [
    {"type": "finding", "label": "vital type", "value": "measurement", "confidence": 0.0-1.0}
  ],
  "summary": "2-3 sentence clinical summary of the document",
  "keyFindings": ["array of important clinical findings"],
  "followUpRecommendations": ["array of recommended follow-ups or next steps mentioned"]
}

If a section has no relevant data, return an empty array [].
If a field cannot be determined, return null.`;

export async function analyzeDocumentWithAI(
  document: DocumentRecord,
  filePath?: string
): Promise<AIDocumentAnalysis> {
  const startTime = Date.now();
  const path = filePath || document.sourcePath;

  try {
    // Extract PDF text
    const extraction = await extractPdfText(path);

    if (extraction.error || !extraction.text) {
      return createErrorAnalysis(document, startTime, extraction.error || "empty_text");
    }

    // Cap text length for API limits (approximately 100k tokens max)
    const maxTextLength = 120000;
    const text = extraction.text.length > maxTextLength 
      ? extraction.text.slice(0, maxTextLength) + "\n\n[DOCUMENT TRUNCATED]"
      : extraction.text;

    // Call OpenAI for intelligent extraction
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: MEDICAL_EXTRACTION_PROMPT
        },
        {
          role: "user",
          content: `Document: ${document.fileName}\nSpecialty: ${document.specialty}\nYear: ${document.year}\n\n--- DOCUMENT TEXT ---\n${text}`
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.1, // Low temperature for consistent extraction
      max_tokens: 4000
    });

    const responseContent = completion.choices[0]?.message?.content;
    if (!responseContent) {
      return createErrorAnalysis(document, startTime, "empty_ai_response");
    }

    const extracted = JSON.parse(responseContent);
    const processingTimeMs = Date.now() - startTime;

    return {
      documentId: document.id,
      fileName: document.fileName,
      year: document.year,
      specialty: document.specialty,
      analysisTimestamp: new Date().toISOString(),

      documentType: extracted.documentType || "unknown",
      documentDate: extracted.documentDate || document.eventDate || null,
      provider: extracted.provider || document.provider || null,
      facility: extracted.facility || null,

      chiefComplaint: extracted.chiefComplaint || null,
      diagnoses: extracted.diagnoses || [],
      medications: extracted.medications || [],
      labResults: extracted.labResults || [],
      imagingFindings: extracted.imagingFindings || [],
      procedures: extracted.procedures || [],
      allergies: extracted.allergies || [],
      vitalSigns: extracted.vitalSigns || [],

      summary: extracted.summary || "",
      keyFindings: extracted.keyFindings || [],
      followUpRecommendations: extracted.followUpRecommendations || [],

      confidence: calculateOverallConfidence(extracted),
      rawTextLength: extraction.text.length,
      processingTimeMs
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "unknown_error";
    return createErrorAnalysis(document, startTime, errorMessage);
  }
}

function createErrorAnalysis(
  document: DocumentRecord,
  startTime: number,
  error: string
): AIDocumentAnalysis {
  return {
    documentId: document.id,
    fileName: document.fileName,
    year: document.year,
    specialty: document.specialty,
    analysisTimestamp: new Date().toISOString(),

    documentType: "unknown",
    documentDate: null,
    provider: null,
    facility: null,

    chiefComplaint: null,
    diagnoses: [],
    medications: [],
    labResults: [],
    imagingFindings: [],
    procedures: [],
    allergies: [],
    vitalSigns: [],

    summary: "",
    keyFindings: [],
    followUpRecommendations: [],

    confidence: 0,
    rawTextLength: 0,
    processingTimeMs: Date.now() - startTime,
    error
  };
}

function calculateOverallConfidence(extracted: Record<string, unknown>): number {
  const allEntities = [
    ...(extracted.diagnoses as AIExtractedEntity[] || []),
    ...(extracted.medications as AIExtractedEntity[] || []),
    ...(extracted.labResults as AIExtractedEntity[] || []),
    ...(extracted.imagingFindings as AIExtractedEntity[] || []),
    ...(extracted.procedures as AIExtractedEntity[] || [])
  ];

  if (allEntities.length === 0) {
    return extracted.summary ? 0.5 : 0.2;
  }

  const avgConfidence = allEntities.reduce((sum, e) => sum + (e.confidence || 0), 0) / allEntities.length;
  return Math.round(avgConfidence * 100) / 100;
}

export async function analyzeYearFiles(
  documents: DocumentRecord[],
  year: number,
  onProgress?: (current: number, total: number, fileName: string) => void
): Promise<YearAnalysisReport> {
  const yearDocs = documents.filter(d => d.year === year);
  const analyses: AIDocumentAnalysis[] = [];
  let successful = 0;
  let failed = 0;

  for (let i = 0; i < yearDocs.length; i++) {
    const doc = yearDocs[i];
    onProgress?.(i + 1, yearDocs.length, doc.fileName);

    const analysis = await analyzeDocumentWithAI(doc);
    analyses.push(analysis);

    if (analysis.error) {
      failed++;
    } else {
      successful++;
    }

    // Rate limiting - wait 500ms between API calls
    if (i < yearDocs.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  const yearSummary = generateYearSummary(analyses);

  return {
    year,
    analyzedAt: new Date().toISOString(),
    totalFiles: yearDocs.length,
    successfulAnalyses: successful,
    failedAnalyses: failed,
    analyses,
    yearSummary
  };
}

function generateYearSummary(analyses: AIDocumentAnalysis[]): YearSummary {
  const allDiagnoses = new Set<string>();
  const allMedications = new Set<string>();
  const specialtiesVisited = new Set<string>();
  const keyEvents: string[] = [];
  const labValues: Map<string, { date: string; value: string }[]> = new Map();

  for (const analysis of analyses) {
    if (analysis.error) continue;

    specialtiesVisited.add(analysis.specialty);

    for (const diag of analysis.diagnoses) {
      allDiagnoses.add(diag.label);
    }

    for (const med of analysis.medications) {
      allMedications.add(`${med.label} ${med.value}`.trim());
    }

    for (const lab of analysis.labResults) {
      const existing = labValues.get(lab.label) || [];
      existing.push({
        date: analysis.documentDate || analysis.analysisTimestamp,
        value: lab.value
      });
      labValues.set(lab.label, existing);
    }

    for (const finding of analysis.keyFindings) {
      keyEvents.push(`[${analysis.documentDate || "Unknown date"}] ${finding}`);
    }
  }

  const labTrends = Array.from(labValues.entries()).map(([marker, values]) => ({
    marker,
    values: values.sort((a, b) => a.date.localeCompare(b.date))
  }));

  return {
    allDiagnoses: [...allDiagnoses],
    allMedications: [...allMedications],
    specialtiesVisited: [...specialtiesVisited],
    keyEvents: keyEvents.slice(0, 50), // Limit to top 50 events
    labTrends
  };
}

// Export single file analysis for ad-hoc use
export async function analyzeFileByPath(filePath: string): Promise<AIDocumentAnalysis> {
  const fileName = filePath.split("/").pop() || "unknown";
  const yearMatch = filePath.match(/\/(\d{4})\//);
  const year = yearMatch ? parseInt(yearMatch[1], 10) : new Date().getFullYear();

  const specialtyMatch = filePath.match(/\/\d{4}\/([^/]+)/);
  const specialty = specialtyMatch?.[1] || "unknown";

  const virtualDoc: DocumentRecord = {
    id: `temp_${Date.now()}`,
    sourcePath: filePath,
    sourceSystem: "google_drive",
    fileName,
    year,
    specialty,
    type: "unknown",
    tags: [],
    verificationStatus: "pending",
    parseStatus: "not_started",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  return analyzeDocumentWithAI(virtualDoc, filePath);
}
