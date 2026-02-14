import { describe, expect, it } from "vitest";
import fixtures from "@/tests/fixtures/extraction-fixtures.json";
import { createTextChunks } from "@/lib/services/text-chunker";
import { inferExtractionCandidates } from "@/lib/services/extraction-heuristics";
import type { DocumentRecord } from "@/lib/types/domain";

interface FixtureExpectation {
  type: string;
  fieldKey: string;
  valueIncludes: string;
}

interface ExtractionFixture {
  name: string;
  fileName: string;
  specialty: string;
  fullText: string;
  expectations: FixtureExpectation[];
}

describe("extraction heuristics fixtures", () => {
  it("extracts lab, procedure, and provider signals from representative fixtures", () => {
    const typedFixtures = fixtures as ExtractionFixture[];

    for (const fixture of typedFixtures) {
      const document: DocumentRecord = {
        id: `doc_${fixture.name.replace(/\s+/g, "_").toLowerCase()}`,
        sourcePath: `/tmp/MEDICAL RECORDS BY YEAR/2025/GP/${fixture.fileName}`,
        sourceSystem: "google_drive",
        fileName: fixture.fileName,
        year: 2025,
        specialty: fixture.specialty,
        type: "after_visit_summary",
        tags: [fixture.specialty, "2025"],
        verificationStatus: "pending",
        parseStatus: "parsed",
        createdAt: "2025-01-01T00:00:00.000Z",
        updatedAt: "2025-01-01T00:00:00.000Z"
      };

      const chunks = createTextChunks(fixture.fullText, { maxChars: 180, overlapChars: 20, minChars: 60 });
      const candidates = inferExtractionCandidates({
        document,
        fullText: fixture.fullText,
        chunks
      });

      for (const expectation of fixture.expectations) {
        const matched = candidates.some(
          (candidate) =>
            candidate.type === expectation.type &&
            candidate.fieldKey === expectation.fieldKey &&
            candidate.value.toLowerCase().includes(expectation.valueIncludes.toLowerCase())
        );

        expect(matched, `Fixture ${fixture.name} missing ${expectation.type}/${expectation.fieldKey}=${expectation.valueIncludes}`).toBe(true);
      }
    }
  });
});
