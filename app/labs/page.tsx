import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { listRecords, listAllExtractedEntities } from "@/lib/repositories/runtime";

interface LabResult {
  id: string;
  documentId: string;
  testName: string;
  value: string;
  unit: string;
  reference: string;
  date: string;
  year: number;
  specialty: string;
}

function parseLabEntity(entity: { id: string; documentId: string; label: string; value: string; createdAt: string }, docMap: Map<string, { eventDate?: string; year: number; specialty: string }>): LabResult | null {
  // Parse value format: "value unit (ref: reference)"
  const match = entity.value.match(/^([^\s]+)\s*([^\s]*)\s*\(ref:\s*([^)]*)\)$/i);
  if (!match) {
    // Try simpler format
    return {
      id: entity.id,
      documentId: entity.documentId,
      testName: entity.label,
      value: entity.value,
      unit: "",
      reference: "",
      date: docMap.get(entity.documentId)?.eventDate ?? entity.createdAt,
      year: docMap.get(entity.documentId)?.year ?? new Date(entity.createdAt).getFullYear(),
      specialty: docMap.get(entity.documentId)?.specialty ?? "unknown"
    };
  }
  return {
    id: entity.id,
    documentId: entity.documentId,
    testName: entity.label,
    value: match[1],
    unit: match[2],
    reference: match[3],
    date: docMap.get(entity.documentId)?.eventDate ?? entity.createdAt,
    year: docMap.get(entity.documentId)?.year ?? new Date(entity.createdAt).getFullYear(),
    specialty: docMap.get(entity.documentId)?.specialty ?? "unknown"
  };
}

export default async function LabsPage(): Promise<React.JSX.Element> {
  // Get all lab documents and lab entities
  const [labDocs, labEntities] = await Promise.all([
    listRecords({}),
    listAllExtractedEntities("lab")
  ]);

  // Create document lookup map
  const docMap = new Map(labDocs.map(d => [d.id, { eventDate: d.eventDate, year: d.year, specialty: d.specialty }]));

  // Parse lab entities into structured results
  const labResults: LabResult[] = labEntities
    .map(e => parseLabEntity(e, docMap))
    .filter((r): r is LabResult => r !== null)
    .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));

  // Group by test name for trending
  const testGroups = new Map<string, LabResult[]>();
  for (const result of labResults) {
    const existing = testGroups.get(result.testName) ?? [];
    existing.push(result);
    testGroups.set(result.testName, existing);
  }

  // Get lab-specific documents for document list
  const labDocuments = labDocs
    .filter(d => d.type.includes("lab"))
    .sort((a, b) => (b.eventDate ?? b.createdAt).localeCompare(a.eventDate ?? a.createdAt));

  // Stats
  const uniqueTests = testGroups.size;
  const yearsWithData = [...new Set(labResults.map(r => r.year))].sort((a, b) => b - a);

  return (
    <AppShell 
      title="Lab Results" 
      subtitle={`${uniqueTests} test types tracked • ${yearsWithData[yearsWithData.length - 1] ?? "N/A"} – ${yearsWithData[0] ?? "N/A"}`}
    >
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Lab tests with trending */}
        <Card title="Lab Tests by Type" detail="Grouped results with history">
          <div className="max-h-[500px] space-y-3 overflow-y-auto">
            {[...testGroups.entries()]
              .sort((a, b) => b[1].length - a[1].length)
              .slice(0, 30)
              .map(([testName, results]) => (
                <div key={testName} className="rounded-lg border border-[#E2E8F0] bg-white p-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-[#1E293B]">{testName}</p>
                      <p className="text-xs text-[#64748B]">{results.length} result{results.length !== 1 ? "s" : ""}</p>
                    </div>
                    <span className="rounded-full bg-[#F1F5F9] px-2 py-0.5 text-xs text-[#475569]">
                      {results[0]?.year}
                    </span>
                  </div>
                  {/* Show latest results */}
                  <div className="mt-2 space-y-1">
                    {results.slice(0, 3).map((r, i) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <span className="text-[#64748B]">{r.date?.slice(0, 10)}</span>
                        <span className="font-mono text-[#1E293B]">
                          {r.value} {r.unit}
                        </span>
                      </div>
                    ))}
                    {results.length > 3 && (
                      <p className="text-xs text-[#94A3B8]">+{results.length - 3} more</p>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </Card>

        {/* Recent lab documents */}
        <Card title="Recent Lab Documents" detail={`${labDocuments.length} total`}>
          <div className="max-h-[500px] space-y-2 overflow-y-auto">
            {labDocuments.slice(0, 25).map((record) => (
              <Link
                key={record.id}
                href={`/records/${record.id}`}
                className="flex items-center justify-between rounded-lg border border-[#E2E8F0] bg-white p-3 hover:bg-[#F8FAFC]"
              >
                <div>
                  <p className="font-medium text-[#1D4ED8]">{record.fileName}</p>
                  <p className="text-xs text-[#64748B]">
                    {record.specialty} • {record.eventDate?.slice(0, 10) ?? record.year}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded bg-[#F1F5F9] px-2 py-0.5 text-xs text-[#475569]">
                    {record.type.replace(/_/g, " ")}
                  </span>
                  <StatusBadge status={record.verificationStatus} />
                </div>
              </Link>
            ))}
          </div>
        </Card>
      </div>

      {/* Labs by year */}
      <Card className="mt-4" title="Results by Year" detail="Distribution of lab results">
        <div className="flex flex-wrap gap-4">
          {yearsWithData.map(year => {
            const count = labResults.filter(r => r.year === year).length;
            return (
              <div key={year} className="rounded-lg border border-[#E2E8F0] bg-white p-4 text-center">
                <p className="text-2xl font-semibold text-[#1E293B]">{count}</p>
                <p className="text-sm text-[#64748B]">{year}</p>
              </div>
            );
          })}
        </div>
      </Card>
    </AppShell>
  );
}
