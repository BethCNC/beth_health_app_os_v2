#!/usr/bin/env npx tsx
/**
 * Full Medical Records Extraction & Database Import
 * 
 * Extracts COMPLETE word-for-word content from all medical record PDFs,
 * classifies them using AI, and stores everything in Firestore.
 * 
 * Usage:
 *   npx tsx scripts/import-full-records.ts --year 2025
 *   npx tsx scripts/import-full-records.ts --all
 * 
 * Options:
 *   --year     Process a single year
 *   --all      Process all years (2018-2026)
 *   --dry-run  Extract and classify without writing to database
 *   --verbose  Show detailed output
 */

import { readdir, stat, writeFile, mkdir, readFile } from "fs/promises";
import { join } from "path";
import { spawn } from "child_process";
import OpenAI from "openai";

// Load environment variables from .env.local
async function loadEnv() {
  try {
    const envPath = join(process.cwd(), ".env.local");
    const envContent = await readFile(envPath, "utf8");
    for (const line of envContent.split("\n")) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#")) {
        const eqIndex = trimmed.indexOf("=");
        if (eqIndex > 0) {
          const key = trimmed.slice(0, eqIndex);
          const value = trimmed.slice(eqIndex + 1);
          if (!process.env[key]) {
            process.env[key] = value;
          }
        }
      }
    }
  } catch {
    // .env.local not found, rely on existing env vars
  }
}

// Medical records root path
const RECORDS_ROOT = "/Users/bethcartrette/Library/CloudStorage/GoogleDrive-beth@bethcnc.com/My Drive/Health/MEDICAL RECORDS BY YEAR";

// OpenAI client - initialized after env loading
let openai: OpenAI;

// Document types - matching domain.ts
type DocumentType = 
  | "lab_panel" | "lab_single" | "pathology" | "genetic_test"
  | "imaging_mri" | "imaging_ct" | "imaging_xray" | "imaging_ultrasound" | "imaging_other"
  | "office_visit" | "consult_note" | "procedure_note" | "hospital_note" | "after_visit_summary"
  | "referral" | "provider_letter" | "patient_letter" | "prior_auth"
  | "prescription" | "medication_list"
  | "unknown";

interface FullDocumentRecord {
  id: string;
  sourcePath: string;
  fileName: string;
  year: number;
  specialty: string;
  type: DocumentType;
  eventDate: string | null;
  provider: string | null;
  facility: string | null;
  fullText: string;
  pageCount: number;
  fileSizeBytes: number;
  extractedAt: string;
  classificationConfidence: number;
  // AI-extracted metadata
  diagnoses: string[];
  medications: string[];
  procedures: string[];
  labResults: Array<{ test: string; value: string; unit: string; reference: string }>;
  keyFindings: string[];
}

interface YearImportResult {
  year: number;
  importedAt: string;
  totalFiles: number;
  successful: number;
  failed: number;
  documents: FullDocumentRecord[];
  errors: Array<{ file: string; error: string }>;
  bySpecialty: Record<string, number>;
  byType: Record<string, number>;
}

// Parse CLI args
function parseArgs(): { years: number[]; dryRun: boolean; verbose: boolean } {
  const args = process.argv.slice(2);
  let years: number[] = [];
  let dryRun = false;
  let verbose = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--year" && args[i + 1]) {
      years = [parseInt(args[i + 1], 10)];
      i++;
    } else if (arg === "--all") {
      years = [2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026];
    } else if (arg === "--dry-run") {
      dryRun = true;
    } else if (arg === "--verbose") {
      verbose = true;
    }
  }

  if (years.length === 0) {
    years = [2025]; // Default to 2025
  }

  return { years, dryRun, verbose };
}

// Extract text from PDF
async function extractPdfText(filePath: string): Promise<{ text: string; pageCount: number; error?: string }> {
  const pythonScript = `
import json
import sys

path = sys.argv[1]

try:
    import pdfplumber
except Exception as exc:
    print(json.dumps({"ok": False, "error": f"pdfplumber not installed: {exc}"}))
    sys.exit(0)

try:
    with pdfplumber.open(path) as pdf:
        pages = []
        for page in pdf.pages:
            page_text = page.extract_text() or ""
            pages.append(page_text)
        full_text = "\\n\\n--- PAGE BREAK ---\\n\\n".join(pages)
        print(json.dumps({"ok": True, "text": full_text, "pageCount": len(pdf.pages)}))
except Exception as exc:
    print(json.dumps({"ok": False, "error": str(exc)}))
`;

  return new Promise((resolve) => {
    const child = spawn("python3", ["-c", pythonScript, filePath], {
      stdio: ["ignore", "pipe", "pipe"]
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf8");
    });

    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
    });

    child.on("error", (error) => {
      resolve({ text: "", pageCount: 0, error: `spawn_error: ${error.message}` });
    });

    child.on("close", () => {
      const output = stdout.trim();
      if (!output) {
        resolve({ text: "", pageCount: 0, error: stderr || "empty_output" });
        return;
      }

      try {
        const parsed = JSON.parse(output);
        if (parsed.ok) {
          resolve({ text: parsed.text, pageCount: parsed.pageCount });
        } else {
          resolve({ text: "", pageCount: 0, error: parsed.error });
        }
      } catch {
        resolve({ text: "", pageCount: 0, error: "json_parse_error" });
      }
    });
  });
}

// AI classification prompt - focuses on metadata extraction, not summarization
const CLASSIFICATION_PROMPT = `You are a medical document classifier. Analyze this medical document and extract metadata.

IMPORTANT: 
- Extract information EXACTLY as written in the document
- Do not summarize or interpret - preserve exact values
- Include ALL diagnoses, medications, labs, and findings mentioned
- For labs, extract test name, value, units, and reference range exactly as shown

DOCUMENT TYPES - Choose the most specific one:
- lab_panel: Blood work with multiple tests (CBC, metabolic panel, lipid panel)
- lab_single: Single lab test result (TSH only, T4 only)
- pathology: Biopsy results, tissue pathology, cytology
- genetic_test: Genetic or genomic testing results
- imaging_mri: MRI scan report
- imaging_ct: CT scan report
- imaging_xray: X-ray report
- imaging_ultrasound: Ultrasound report
- imaging_other: Other imaging (angiogram, EMG, nerve conduction, echocardiogram)
- office_visit: Regular appointment or follow-up clinical notes
- consult_note: Specialist consultation note
- procedure_note: Documentation of procedure performed (colonoscopy, endoscopy, injection)
- hospital_note: Inpatient admission, ER visit, or discharge summary
- after_visit_summary: Patient-facing summary with instructions
- referral: Referral to another provider/specialist
- provider_letter: Letter from one provider to another
- patient_letter: Letter addressed to the patient
- prior_auth: Insurance prior authorization or medical necessity letter
- prescription: Prescription or medication order
- medication_list: List of current medications

Return JSON:
{
  "documentType": "<one of the types above>",
  "eventDate": "YYYY-MM-DD or null if unclear",
  "provider": "Dr. Name exactly as written or null",
  "facility": "Hospital/clinic name or null",
  "diagnoses": ["exact diagnosis text as written"],
  "medications": ["exact medication with dosage as written"],
  "procedures": ["exact procedure name as written"],
  "labResults": [{"test": "name", "value": "number", "unit": "unit", "reference": "ref range"}],
  "keyFindings": ["important clinical findings verbatim"],
  "confidence": 0.0-1.0
}`;

// Classify document with AI
async function classifyDocument(
  text: string,
  fileName: string,
  specialty: string
): Promise<{
  type: DocumentType;
  eventDate: string | null;
  provider: string | null;
  facility: string | null;
  diagnoses: string[];
  medications: string[];
  procedures: string[];
  labResults: Array<{ test: string; value: string; unit: string; reference: string }>;
  keyFindings: string[];
  confidence: number;
}> {
  // Truncate for API but we still store FULL text
  const maxLen = 80000;
  const truncatedText = text.length > maxLen ? text.slice(0, maxLen) + "\n[...truncated for classification]" : text;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: CLASSIFICATION_PROMPT },
        { role: "user", content: `File: ${fileName}\nSpecialty folder: ${specialty}\n\n${truncatedText}` }
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
      max_tokens: 4000
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      return defaultClassification();
    }

    const parsed = JSON.parse(content);
    return {
      type: (parsed.documentType as DocumentType) || "other",
      eventDate: parsed.eventDate || null,
      provider: parsed.provider || null,
      facility: parsed.facility || null,
      diagnoses: parsed.diagnoses || [],
      medications: parsed.medications || [],
      procedures: parsed.procedures || [],
      labResults: parsed.labResults || [],
      keyFindings: parsed.keyFindings || [],
      confidence: parsed.confidence || 0.5
    };
  } catch (error) {
    console.error(`  Classification error: ${error instanceof Error ? error.message : "unknown"}`);
    return defaultClassification();
  }
}

function defaultClassification() {
  return {
    type: "unknown" as DocumentType,
    eventDate: null,
    provider: null,
    facility: null,
    diagnoses: [],
    medications: [],
    procedures: [],
    labResults: [],
    keyFindings: [],
    confidence: 0
  };
}

// Generate unique ID
function generateId(prefix: string): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}_${timestamp}_${random}`;
}

// Parse file path to extract year and specialty
function parseFilePath(filePath: string): { year: number; specialty: string; subfolders: string[] } {
  const parts = filePath.split("/");
  let year = new Date().getFullYear();
  let specialty = "unknown";
  const subfolders: string[] = [];

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (/^20\d{2}$/.test(part)) {
      year = parseInt(part, 10);
      // Everything after year until filename is specialty/subfolders
      for (let j = i + 1; j < parts.length - 1; j++) {
        if (j === i + 1) {
          specialty = parts[j];
        } else {
          subfolders.push(parts[j]);
        }
      }
      break;
    }
  }

  return { year, specialty, subfolders };
}

// Scan for PDF files
async function scanYearFolder(year: number): Promise<string[]> {
  const yearPath = join(RECORDS_ROOT, String(year));
  const files: string[] = [];

  async function walk(dir: string) {
    try {
      const entries = await readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = join(dir, entry.name);
        if (entry.isDirectory()) {
          await walk(fullPath);
        } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".pdf")) {
          files.push(fullPath);
        }
      }
    } catch {
      // Directory doesn't exist or can't be read
    }
  }

  await walk(yearPath);
  return files.sort();
}

// Process a single file
async function processFile(filePath: string, verbose: boolean): Promise<FullDocumentRecord | null> {
  const fileName = filePath.split("/").pop() || "unknown";
  const { year, specialty, subfolders } = parseFilePath(filePath);

  if (verbose) {
    console.log(`    Extracting text...`);
  }

  // Get file size
  let fileSizeBytes = 0;
  try {
    const fileInfo = await stat(filePath);
    fileSizeBytes = fileInfo.size;
  } catch {
    // Ignore
  }

  // Extract FULL text
  const extraction = await extractPdfText(filePath);

  if (extraction.error || !extraction.text.trim()) {
    throw new Error(extraction.error || "empty_text");
  }

  if (verbose) {
    console.log(`    Extracted ${extraction.text.length} chars from ${extraction.pageCount} pages`);
    console.log(`    Classifying with AI...`);
  }

  // Classify with AI
  const classification = await classifyDocument(extraction.text, fileName, specialty);

  const record: FullDocumentRecord = {
    id: generateId("doc"),
    sourcePath: filePath,
    fileName,
    year,
    specialty: normalizeSpecialty(specialty),
    type: classification.type,
    eventDate: classification.eventDate,
    provider: classification.provider,
    facility: classification.facility,
    fullText: extraction.text, // COMPLETE text - every word
    pageCount: extraction.pageCount,
    fileSizeBytes,
    extractedAt: new Date().toISOString(),
    classificationConfidence: classification.confidence,
    diagnoses: classification.diagnoses,
    medications: classification.medications,
    procedures: classification.procedures,
    labResults: classification.labResults,
    keyFindings: classification.keyFindings
  };

  return record;
}

// Normalize specialty names
function normalizeSpecialty(raw: string): string {
  const normalized = raw.toLowerCase().trim();
  const mappings: Record<string, string> = {
    "gp": "primary_care",
    "gastro": "gastroenterology",
    "gi": "gastroenterology",
    "psych": "psychiatry",
    "neuro": "neurology",
    "cardio": "cardiology",
    "endo": "endocrinology",
    "rheum": "rheumatology",
    "mcas": "immunology_mcas",
    "allergy": "allergy_immunology"
  };
  return mappings[normalized] || normalized;
}

// Process entire year
async function processYear(year: number, dryRun: boolean, verbose: boolean): Promise<YearImportResult> {
  console.log(`\n${"=".repeat(70)}`);
  console.log(`📅 PROCESSING YEAR ${year}`);
  console.log(`${"=".repeat(70)}\n`);

  const files = await scanYearFolder(year);
  console.log(`Found ${files.length} PDF files\n`);

  if (files.length === 0) {
    return {
      year,
      importedAt: new Date().toISOString(),
      totalFiles: 0,
      successful: 0,
      failed: 0,
      documents: [],
      errors: [],
      bySpecialty: {},
      byType: {}
    };
  }

  const documents: FullDocumentRecord[] = [];
  const errors: Array<{ file: string; error: string }> = [];
  const bySpecialty: Record<string, number> = {};
  const byType: Record<string, number> = {};

  for (let i = 0; i < files.length; i++) {
    const filePath = files[i];
    const fileName = filePath.split("/").pop() || "unknown";
    const { specialty } = parseFilePath(filePath);

    console.log(`[${i + 1}/${files.length}] ${specialty}/${fileName}`);

    try {
      const record = await processFile(filePath, verbose);

      if (record) {
        documents.push(record);
        bySpecialty[record.specialty] = (bySpecialty[record.specialty] || 0) + 1;
        byType[record.type] = (byType[record.type] || 0) + 1;

        console.log(`  ✅ ${record.type} | ${record.eventDate || "no date"} | ${record.diagnoses.length} diagnoses | ${record.labResults.length} labs`);
        
        if (verbose && record.keyFindings.length > 0) {
          console.log(`     Key findings: ${record.keyFindings.slice(0, 2).join("; ")}`);
        }
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "unknown_error";
      errors.push({ file: fileName, error: errorMsg });
      console.log(`  ❌ Error: ${errorMsg}`);
    }

    // Rate limiting for API
    if (i < files.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  }

  const result: YearImportResult = {
    year,
    importedAt: new Date().toISOString(),
    totalFiles: files.length,
    successful: documents.length,
    failed: errors.length,
    documents,
    errors,
    bySpecialty,
    byType
  };

  // Save to output directory
  const outputDir = join(process.cwd(), "extracted-records");
  await mkdir(outputDir, { recursive: true });

  const outputPath = join(outputDir, `year-${year}-full-extraction.json`);
  await writeFile(outputPath, JSON.stringify(result, null, 2));
  console.log(`\n📁 Saved full extraction to: ${outputPath}`);

  // Also save a summary without full text for easier review
  const summaryPath = join(outputDir, `year-${year}-summary.json`);
  const summary = {
    ...result,
    documents: result.documents.map((d) => ({
      ...d,
      fullText: `[${d.fullText.length} characters - see full extraction file]`,
      textPreview: d.fullText.slice(0, 500)
    }))
  };
  await writeFile(summaryPath, JSON.stringify(summary, null, 2));

  if (!dryRun) {
    console.log(`\n💾 Writing ${documents.length} documents to Firestore...`);
    await writeToFirestore(documents);
  } else {
    console.log(`\n🔍 DRY RUN - Skipped database write`);
  }

  return result;
}

// Write documents to Firestore
async function writeToFirestore(documents: FullDocumentRecord[]): Promise<void> {
  try {
    // Dynamic import to handle module resolution
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const adminRuntime = require("../lib/firebase/admin-runtime.js") as {
      getAdminContext: () => { enabled: boolean; reason?: string };
      setDocument: (collectionName: string, id: string, data: unknown) => Promise<unknown>;
    };
    
    const context = adminRuntime.getAdminContext();
    if (!context.enabled) {
      console.log(`  ⚠️  Firestore not available: ${context.reason}`);
      console.log(`  📁 Data saved to local JSON files instead`);
      return;
    }

    let written = 0;
    for (const doc of documents) {
      // Store main document record
      await adminRuntime.setDocument("documents", doc.id, {
        id: doc.id,
        sourcePath: doc.sourcePath,
        sourceSystem: "google_drive",
        fileName: doc.fileName,
        year: doc.year,
        specialty: doc.specialty,
        type: doc.type,
        eventDate: doc.eventDate,
        provider: doc.provider,
        facility: doc.facility,
        pageCount: doc.pageCount,
        fileSizeBytes: doc.fileSizeBytes,
        verificationStatus: "verified", // Auto-verified since it's from source
        parseStatus: "parsed",
        indexedAt: doc.extractedAt,
        createdAt: doc.extractedAt,
        updatedAt: doc.extractedAt,
        tags: [doc.specialty, doc.type, String(doc.year)],
        textPreview: doc.fullText.slice(0, 1000)
      });

      // Store full text in separate collection (Firestore has 1MB doc limit)
      await adminRuntime.setDocument("document_full_text", doc.id, {
        id: doc.id,
        documentId: doc.id,
        fullText: doc.fullText,
        pageCount: doc.pageCount,
        extractedAt: doc.extractedAt
      });

      // Store extracted entities
      for (const diagnosis of doc.diagnoses) {
        const entityId = generateId("ent");
        await adminRuntime.setDocument("extracted_entities", entityId, {
          id: entityId,
          documentId: doc.id,
          type: "diagnosis",
          label: "Diagnosis",
          value: diagnosis,
          confidence: doc.classificationConfidence,
          sourceChunkIds: [],
          verificationStatus: "verified",
          createdAt: doc.extractedAt
        });
      }

      for (const med of doc.medications) {
        const entityId = generateId("ent");
        await adminRuntime.setDocument("extracted_entities", entityId, {
          id: entityId,
          documentId: doc.id,
          type: "medication",
          label: "Medication",
          value: med,
          confidence: doc.classificationConfidence,
          sourceChunkIds: [],
          verificationStatus: "verified",
          createdAt: doc.extractedAt
        });
      }

      for (const lab of doc.labResults) {
        const entityId = generateId("ent");
        await adminRuntime.setDocument("extracted_entities", entityId, {
          id: entityId,
          documentId: doc.id,
          type: "lab",
          label: lab.test,
          value: `${lab.value} ${lab.unit} (ref: ${lab.reference})`,
          confidence: doc.classificationConfidence,
          sourceChunkIds: [],
          verificationStatus: "verified",
          createdAt: doc.extractedAt
        });
      }

      written++;
      if (written % 10 === 0) {
        console.log(`  Written ${written}/${documents.length} documents`);
      }
    }

    console.log(`  ✅ Successfully wrote ${written} documents to Firestore`);
  } catch (error) {
    console.log(`  ⚠️  Firestore write failed: ${error instanceof Error ? error.message : "unknown"}`);
    console.log(`  📁 Data saved to local JSON files instead`);
  }
}

// Main execution
async function main() {
  // Load environment variables first
  await loadEnv();

  // Initialize OpenAI after env is loaded
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });

  console.log("\n🏥 FULL MEDICAL RECORDS EXTRACTION\n");
  console.log("This will extract COMPLETE word-for-word content from all PDFs.\n");

  if (!process.env.OPENAI_API_KEY) {
    console.error("❌ Error: OPENAI_API_KEY environment variable is required");
    process.exit(1);
  }

  const { years, dryRun, verbose } = parseArgs();

  console.log(`📂 Source: ${RECORDS_ROOT}`);
  console.log(`📅 Years: ${years.join(", ")}`);
  console.log(`🔍 Dry run: ${dryRun}`);
  console.log(`📝 Verbose: ${verbose}`);

  const allResults: YearImportResult[] = [];

  for (const year of years) {
    const result = await processYear(year, dryRun, verbose);
    allResults.push(result);

    console.log(`\n📊 Year ${year} Summary:`);
    console.log(`   Total files: ${result.totalFiles}`);
    console.log(`   Successful: ${result.successful}`);
    console.log(`   Failed: ${result.failed}`);
    console.log(`   By specialty: ${Object.entries(result.bySpecialty).map(([k, v]) => `${k}(${v})`).join(", ")}`);
    console.log(`   By type: ${Object.entries(result.byType).map(([k, v]) => `${k}(${v})`).join(", ")}`);
  }

  // Final summary
  console.log(`\n${"=".repeat(70)}`);
  console.log(`📊 FINAL SUMMARY`);
  console.log(`${"=".repeat(70)}`);

  const totalFiles = allResults.reduce((sum, r) => sum + r.totalFiles, 0);
  const totalSuccess = allResults.reduce((sum, r) => sum + r.successful, 0);
  const totalFailed = allResults.reduce((sum, r) => sum + r.failed, 0);

  console.log(`Total files processed: ${totalFiles}`);
  console.log(`Successfully extracted: ${totalSuccess}`);
  console.log(`Failed: ${totalFailed}`);

  // Aggregate by specialty across years
  const allSpecialties: Record<string, number> = {};
  const allTypes: Record<string, number> = {};
  for (const result of allResults) {
    for (const [spec, count] of Object.entries(result.bySpecialty)) {
      allSpecialties[spec] = (allSpecialties[spec] || 0) + count;
    }
    for (const [type, count] of Object.entries(result.byType)) {
      allTypes[type] = (allTypes[type] || 0) + count;
    }
  }

  console.log(`\nBy Specialty:`);
  for (const [spec, count] of Object.entries(allSpecialties).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${spec}: ${count}`);
  }

  console.log(`\nBy Type:`);
  for (const [type, count] of Object.entries(allTypes).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${type}: ${count}`);
  }

  console.log(`\n✅ Extraction complete!`);
  console.log(`📁 Output saved to: ./extracted-records/\n`);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
