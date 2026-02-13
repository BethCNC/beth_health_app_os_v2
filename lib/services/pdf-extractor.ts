import { access } from "fs/promises";
import { spawn } from "child_process";

export interface PdfExtractionResult {
  text: string;
  pageCount: number;
  method: "pdfplumber" | "fallback";
  error?: string;
}

const PYTHON_SCRIPT = `
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
        print(json.dumps({"ok": True, "text": text, "pageCount": len(pdf.pages)}))
except Exception as exc:
    print(json.dumps({"ok": False, "error": str(exc)}))
`;

export async function extractPdfText(filePath: string): Promise<PdfExtractionResult> {
  try {
    await access(filePath);
  } catch {
    return {
      text: "",
      pageCount: 0,
      method: "fallback",
      error: "file_not_found"
    };
  }

  const extraction = await runPythonExtractor(filePath);
  if (!extraction.ok) {
    return {
      text: "",
      pageCount: 0,
      method: "fallback",
      error: extraction.error
    };
  }

  return {
    text: extraction.text,
    pageCount: extraction.pageCount,
    method: "pdfplumber"
  };
}

interface PythonExtractionPayload {
  ok: boolean;
  text: string;
  pageCount: number;
  error?: string;
}

function runPythonExtractor(filePath: string): Promise<PythonExtractionPayload> {
  return new Promise((resolve) => {
    const child = spawn("python3", ["-c", PYTHON_SCRIPT, filePath], {
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
      resolve({ ok: false, text: "", pageCount: 0, error: `python_spawn_error:${error.message}` });
    });

    child.on("close", () => {
      const output = stdout.trim();
      if (!output) {
        resolve({ ok: false, text: "", pageCount: 0, error: stderr || "empty_python_output" });
        return;
      }

      try {
        const parsed = JSON.parse(output) as PythonExtractionPayload;
        if (!parsed.ok) {
          resolve({ ok: false, text: "", pageCount: 0, error: parsed.error ?? "python_extraction_failed" });
          return;
        }

        resolve({
          ok: true,
          text: parsed.text ?? "",
          pageCount: parsed.pageCount ?? 0
        });
      } catch {
        resolve({ ok: false, text: "", pageCount: 0, error: `invalid_python_json:${output.slice(0, 220)}` });
      }
    });
  });
}
