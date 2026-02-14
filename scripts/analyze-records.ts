#!/usr/bin/env npx tsx
/**
 * AI-Powered Medical Records Analyzer
 * 
 * Analyzes medical record PDFs year by year using OpenAI for intelligent extraction.
 * 
 * Usage:
 *   npx tsx scripts/analyze-records.ts --path "/path/to/MEDICAL RECORDS BY YEAR" --year 2025
 *   npx tsx scripts/analyze-records.ts --path "/path/to/MEDICAL RECORDS BY YEAR" --years 2025,2026
 *   npx tsx scripts/analyze-records.ts --file "/path/to/specific-file.pdf"
 * 
 * Options:
 *   --path     Path to the medical records root folder
 *   --year     Single year to analyze (e.g., 2025)
 *   --years    Comma-separated years to analyze (e.g., 2025,2026)
 *   --file     Analyze a single file
 *   --output   Output directory for JSON reports (default: ./analysis-reports)
 *   --verbose  Show detailed output during analysis
 */

import { readdir, stat, mkdir, writeFile } from "fs/promises";
import { join } from "path";
import OpenAI from "openai";
import { spawn } from "child_process";

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

interface AnalysisResult {
  fileName: string;
  filePath: string;
  year: number;
  specialty: string;
  documentType: string;
  documentDate: string | null;
  provider: string | null;
  facility: string | null;
  diagnoses: Array<{ label: string; value: string; confidence: number }>;
  medications: Array<{ label: string; value: string; confidence: number }>;
  labResults: Array<{ label: string; value: string; confidence: number }>;
  imagingFindings: Array<{ label: string; value: string; confidence: number }>;
  procedures: Array<{ label: string; value: string; confidence: number }>;
  allergies: Array<{ label: string; value: string; confidence: number }>;
  summary: string;
  keyFindings: string[];
  error?: string;
  rawTextLength: number;
  processingTimeMs: number;
}

interface YearReport {
  year: number;
  analyzedAt: string;
  totalFiles: number;
  successful: number;
  failed: number;
  analyses: AnalysisResult[];
  summary: {
    allDiagnoses: string[];
    allMedications: string[];
    specialties: string[];
    keyFindings: string[];
  };
}

// Parse CLI arguments
function parseArgs(): {
  path?: string;
  year?: number;
  years?: number[];
  file?: string;
  output: string;
  verbose: boolean;
} {
  const args = process.argv.slice(2);
  const result: {
    path?: string;
    year?: number;
    years?: number[];
    file?: string;
    output: string;
    verbose: boolean;
  } = {
    output: "./analysis-reports",
    verbose: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const nextArg = args[i + 1];

    if (arg === "--path" && nextArg) {
      result.path = nextArg;
      i++;
    } else if (arg === "--year" && nextArg) {
      result.year = parseInt(nextArg, 10);
      i++;
    } else if (arg === "--years" && nextArg) {
      result.years = nextArg.split(",").map((y) => parseInt(y.trim(), 10));
      i++;
    } else if (arg === "--file" && nextArg) {
      result.file = nextArg;
      i++;
    } else if (arg === "--output" && nextArg) {
      result.output = nextArg;
      i++;
    } else if (arg === "--verbose") {
      result.verbose = true;
    }
  }

  return result;
}

// Extract text from PDF using Python pdfplumber
async function extractPdfText(filePath: string): Promise<{ text: string; error?: string }> {
  const pythonScript = `
import json
import sys

path = sys.argv[1]

try:
    import pdfplumber
except Exception as exc:
    print(json.dumps({"ok": False, "error": f"pdfplumber_import_error: {exc}"}))
    sys.exit(0)

try:
    with pdfplumber.open(path) as pdf:
        pages = []
        for page in pdf.pages:
            page_text = page.extract_text() or ""
            pages.append(page_text)
        text = "\\n\\n".join(pages).strip()
        print(json.dumps({"ok": True, "text": text}))
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
      resolve({ text: "", error: `spawn_error: ${error.message}` });
    });

    child.on("close", () => {
      const output = stdout.trim();
      if (!output) {
        resolve({ text: "", error: stderr || "empty_output" });
        return;
      }

      try {
        const parsed = JSON.parse(output);
        if (parsed.ok) {
          resolve({ text: parsed.text });
        } else {
          resolve({ text: "", error: parsed.error });
        }
      } catch {
        resolve({ text: "", error: "json_parse_error" });
      }
    });
  });
}

// Analyze document with OpenAI
async function analyzeWithAI(
  text: string,
  fileName: string,
  specialty: string,
  year: number
): Promise<Omit<AnalysisResult, "filePath" | "rawTextLength" | "processingTimeMs">> {
  const prompt = `You are a medical document analyzer. Extract structured data from this medical document.

IMPORTANT RULES:
1. Only extract information explicitly stated in the document
2. Do not infer or assume information not present
3. Use exact values from the document
4. For dates, use ISO format (YYYY-MM-DD) when possible
5. Confidence should reflect how clearly the information is stated (0.0-1.0)

Return a JSON object with this structure:
{
  "documentType": "lab_result|imaging_report|appointment_note|letter|prescription|procedure_note|referral|other",
  "documentDate": "YYYY-MM-DD or null",
  "provider": "Dr. Name or null",
  "facility": "Hospital/Clinic name or null",
  "diagnoses": [{"label": "condition", "value": "code/details", "confidence": 0.0-1.0}],
  "medications": [{"label": "drug name", "value": "dosage", "confidence": 0.0-1.0}],
  "labResults": [{"label": "test name", "value": "result with units", "confidence": 0.0-1.0}],
  "imagingFindings": [{"label": "imaging type", "value": "finding", "confidence": 0.0-1.0}],
  "procedures": [{"label": "procedure name", "value": "details", "confidence": 0.0-1.0}],
  "allergies": [{"label": "allergen", "value": "reaction", "confidence": 0.0-1.0}],
  "summary": "2-3 sentence clinical summary",
  "keyFindings": ["array of important findings"]
}`;

  // Cap text length
  const maxLength = 100000;
  const truncatedText = text.length > maxLength ? text.slice(0, maxLength) + "\n[TRUNCATED]" : text;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: prompt },
        {
          role: "user",
          content: `File: ${fileName}\nSpecialty: ${specialty}\nYear: ${year}\n\n--- DOCUMENT ---\n${truncatedText}`
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
      max_tokens: 4000
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      return {
        fileName,
        year,
        specialty,
        documentType: "unknown",
        documentDate: null,
        provider: null,
        facility: null,
        diagnoses: [],
        medications: [],
        labResults: [],
        imagingFindings: [],
        procedures: [],
        allergies: [],
        summary: "",
        keyFindings: [],
        error: "empty_ai_response"
      };
    }

    const parsed = JSON.parse(content);
    return {
      fileName,
      year,
      specialty,
      documentType: parsed.documentType || "unknown",
      documentDate: parsed.documentDate || null,
      provider: parsed.provider || null,
      facility: parsed.facility || null,
      diagnoses: parsed.diagnoses || [],
      medications: parsed.medications || [],
      labResults: parsed.labResults || [],
      imagingFindings: parsed.imagingFindings || [],
      procedures: parsed.procedures || [],
      allergies: parsed.allergies || [],
      summary: parsed.summary || "",
      keyFindings: parsed.keyFindings || []
    };
  } catch (error) {
    return {
      fileName,
      year,
      specialty,
      documentType: "unknown",
      documentDate: null,
      provider: null,
      facility: null,
      diagnoses: [],
      medications: [],
      labResults: [],
      imagingFindings: [],
      procedures: [],
      allergies: [],
      summary: "",
      keyFindings: [],
      error: error instanceof Error ? error.message : "unknown_error"
    };
  }
}

// Scan directory for PDF files
async function scanDirectory(dirPath: string): Promise<string[]> {
  const files: string[] = [];

  async function walk(dir: string) {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
      } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".pdf")) {
        files.push(fullPath);
      }
    }
  }

  await walk(dirPath);
  return files;
}

// Extract year and specialty from path
function parseFilePath(filePath: string): { year: number; specialty: string } {
  const parts = filePath.split("/");
  let year = new Date().getFullYear();
  let specialty = "unknown";

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    const yearMatch = part.match(/^(20\d{2})$/);
    if (yearMatch) {
      year = parseInt(yearMatch[1], 10);
      if (parts[i + 1]) {
        specialty = parts[i + 1];
      }
      break;
    }
  }

  return { year, specialty };
}

// Analyze a single file
async function analyzeSingleFile(filePath: string, verbose: boolean): Promise<AnalysisResult> {
  const startTime = Date.now();
  const fileName = filePath.split("/").pop() || "unknown";
  const { year, specialty } = parseFilePath(filePath);

  if (verbose) {
    console.log(`  📄 Analyzing: ${fileName}`);
  }

  const extraction = await extractPdfText(filePath);

  if (extraction.error || !extraction.text) {
    return {
      fileName,
      filePath,
      year,
      specialty,
      documentType: "unknown",
      documentDate: null,
      provider: null,
      facility: null,
      diagnoses: [],
      medications: [],
      labResults: [],
      imagingFindings: [],
      procedures: [],
      allergies: [],
      summary: "",
      keyFindings: [],
      error: extraction.error || "empty_text",
      rawTextLength: 0,
      processingTimeMs: Date.now() - startTime
    };
  }

  const analysis = await analyzeWithAI(extraction.text, fileName, specialty, year);

  return {
    ...analysis,
    filePath,
    rawTextLength: extraction.text.length,
    processingTimeMs: Date.now() - startTime
  };
}

// Generate year summary
function generateSummary(analyses: AnalysisResult[]): YearReport["summary"] {
  const diagnoses = new Set<string>();
  const medications = new Set<string>();
  const specialties = new Set<string>();
  const findings: string[] = [];

  for (const a of analyses) {
    if (a.error) continue;
    specialties.add(a.specialty);
    a.diagnoses.forEach((d) => diagnoses.add(d.label));
    a.medications.forEach((m) => medications.add(`${m.label} ${m.value}`.trim()));
    findings.push(...a.keyFindings.map((f) => `[${a.documentDate || a.specialty}] ${f}`));
  }

  return {
    allDiagnoses: [...diagnoses],
    allMedications: [...medications],
    specialties: [...specialties],
    keyFindings: findings.slice(0, 50)
  };
}

// Main execution
async function main() {
  const args = parseArgs();

  console.log("\n🏥 AI Medical Records Analyzer\n");

  if (!process.env.OPENAI_API_KEY) {
    console.error("❌ Error: OPENAI_API_KEY environment variable is required");
    console.error("   Set it with: export OPENAI_API_KEY=your-key-here");
    process.exit(1);
  }

  // Ensure output directory exists
  await mkdir(args.output, { recursive: true });

  // Single file mode
  if (args.file) {
    console.log(`📄 Analyzing single file: ${args.file}\n`);
    const result = await analyzeSingleFile(args.file, true);

    const outputPath = join(args.output, `single-file-analysis-${Date.now()}.json`);
    await writeFile(outputPath, JSON.stringify(result, null, 2));

    console.log("\n✅ Analysis complete!");
    console.log(`   Document Type: ${result.documentType}`);
    console.log(`   Date: ${result.documentDate || "Unknown"}`);
    console.log(`   Diagnoses: ${result.diagnoses.length}`);
    console.log(`   Medications: ${result.medications.length}`);
    console.log(`   Lab Results: ${result.labResults.length}`);
    console.log(`   Report saved: ${outputPath}\n`);
    return;
  }

  // Year-based analysis
  if (!args.path) {
    console.error("❌ Error: --path is required for year-based analysis");
    console.error("   Usage: npx tsx scripts/analyze-records.ts --path '/path/to/records' --year 2025");
    process.exit(1);
  }

  const yearsToAnalyze = args.years || (args.year ? [args.year] : [2025, 2026]);
  console.log(`📂 Records path: ${args.path}`);
  console.log(`📅 Years to analyze: ${yearsToAnalyze.join(", ")}\n`);

  for (const year of yearsToAnalyze) {
    const yearPath = join(args.path, String(year));

    try {
      await stat(yearPath);
    } catch {
      console.log(`⚠️  Year ${year}: Folder not found at ${yearPath}, skipping\n`);
      continue;
    }

    console.log(`\n${"=".repeat(60)}`);
    console.log(`📅 YEAR ${year}`);
    console.log(`${"=".repeat(60)}\n`);

    const pdfFiles = await scanDirectory(yearPath);
    console.log(`Found ${pdfFiles.length} PDF files\n`);

    if (pdfFiles.length === 0) {
      continue;
    }

    const analyses: AnalysisResult[] = [];
    let successful = 0;
    let failed = 0;

    for (let i = 0; i < pdfFiles.length; i++) {
      const file = pdfFiles[i];
      const fileName = file.split("/").pop();
      console.log(`[${i + 1}/${pdfFiles.length}] ${fileName}`);

      const result = await analyzeSingleFile(file, args.verbose);
      analyses.push(result);

      if (result.error) {
        console.log(`   ❌ Error: ${result.error}`);
        failed++;
      } else {
        console.log(`   ✅ ${result.documentType} | ${result.diagnoses.length} diagnoses | ${result.labResults.length} labs`);
        successful++;
      }

      // Rate limiting
      if (i < pdfFiles.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    const report: YearReport = {
      year,
      analyzedAt: new Date().toISOString(),
      totalFiles: pdfFiles.length,
      successful,
      failed,
      analyses,
      summary: generateSummary(analyses)
    };

    const outputPath = join(args.output, `year-${year}-analysis.json`);
    await writeFile(outputPath, JSON.stringify(report, null, 2));

    console.log(`\n📊 Year ${year} Summary:`);
    console.log(`   Total Files: ${report.totalFiles}`);
    console.log(`   Successful: ${successful}`);
    console.log(`   Failed: ${failed}`);
    console.log(`   Diagnoses Found: ${report.summary.allDiagnoses.length}`);
    console.log(`   Medications Found: ${report.summary.allMedications.length}`);
    console.log(`   Specialties: ${report.summary.specialties.join(", ")}`);
    console.log(`   Report saved: ${outputPath}`);
  }

  console.log("\n✅ All analyses complete!\n");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
