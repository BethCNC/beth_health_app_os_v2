import { NextResponse } from "next/server";
import { z } from "zod";
import { analyzeFileByPath, analyzeYearFiles } from "@/lib/services/ai-document-analyzer";
import { scanDriveFolder } from "@/lib/services/local-drive-scanner";
import { normalizeDriveFiles } from "@/lib/services/ingestion-service";

const analyzeRequestSchema = z.union([
  // Analyze a single file
  z.object({
    mode: z.literal("single"),
    filePath: z.string().min(1)
  }),
  // Analyze all files for a year
  z.object({
    mode: z.literal("year"),
    rootPath: z.string().min(1),
    year: z.number().int().min(2000).max(2099)
  }),
  // Analyze multiple years
  z.object({
    mode: z.literal("multi-year"),
    rootPath: z.string().min(1),
    years: z.array(z.number().int().min(2000).max(2099)).min(1)
  })
]);

export async function POST(request: Request): Promise<NextResponse> {
  const payload = await request.json().catch(() => null);
  const parsed = analyzeRequestSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const data = parsed.data;

  try {
    if (data.mode === "single") {
      // Analyze single file
      const analysis = await analyzeFileByPath(data.filePath);
      return NextResponse.json({
        mode: "single",
        analysis
      });
    }

    if (data.mode === "year") {
      // Analyze all files for a single year
      const files = await scanDriveFolder({
        rootPath: data.rootPath,
        years: [data.year]
      });

      const normalized = normalizeDriveFiles(files);
      const report = await analyzeYearFiles(
        normalized.accepted.map(a => a.record),
        data.year
      );

      return NextResponse.json({
        mode: "year",
        report
      });
    }

    if (data.mode === "multi-year") {
      // Analyze multiple years
      const reports = [];

      for (const year of data.years) {
        const files = await scanDriveFolder({
          rootPath: data.rootPath,
          years: [year]
        });

        const normalized = normalizeDriveFiles(files);
        const report = await analyzeYearFiles(
          normalized.accepted.map(a => a.record),
          year
        );

        reports.push(report);
      }

      return NextResponse.json({
        mode: "multi-year",
        reports
      });
    }

    return NextResponse.json({ error: "Unknown mode" }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Analysis failed", details: message },
      { status: 500 }
    );
  }
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    description: "AI Document Analysis API",
    modes: [
      {
        mode: "single",
        description: "Analyze a single file",
        params: { filePath: "string - absolute path to PDF file" }
      },
      {
        mode: "year",
        description: "Analyze all files for a year",
        params: {
          rootPath: "string - path to MEDICAL RECORDS BY YEAR folder",
          year: "number - e.g., 2025"
        }
      },
      {
        mode: "multi-year",
        description: "Analyze multiple years",
        params: {
          rootPath: "string - path to MEDICAL RECORDS BY YEAR folder",
          years: "number[] - e.g., [2025, 2026]"
        }
      }
    ]
  });
}
