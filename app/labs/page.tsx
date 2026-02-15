import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { listRecords, listAllExtractedEntities } from "@/lib/repositories/runtime";
import {
  extractNumericValue,
  isOutOfRange,
  normalizeLabTestName,
  parseReferenceRange
} from "@/lib/utils/lab-flowsheet";

interface LabResult {
  id: string;
  documentId: string;
  testName: string;
  canonicalTestName: string;
  value: string;
  numericValue?: number;
  unit: string;
  reference: string;
  outOfRange: boolean;
  date: string;
  year: number;
  specialty: string;
}

interface LabsPageProps {
  searchParams: Promise<{
    focus?: string;
    pin?: string;
  }>;
}

function parseLabEntity(
  entity: { id: string; documentId: string; label: string; value: string; createdAt: string },
  docMap: Map<string, { eventDate?: string; year: number; specialty: string }>
): LabResult {
  const canonicalTestName = normalizeLabTestName(entity.label);

  // Parse value format: "value unit (ref: reference)"
  const match = entity.value.match(/^([^\s]+)\s*([^\s]*)\s*\(ref:\s*([^)]*)\)$/i);
  if (!match) {
    const numericValue = extractNumericValue(entity.value);
    return {
      id: entity.id,
      documentId: entity.documentId,
      testName: entity.label,
      canonicalTestName,
      value: entity.value,
      numericValue,
      unit: "",
      reference: "",
      outOfRange: false,
      date: docMap.get(entity.documentId)?.eventDate ?? entity.createdAt,
      year: docMap.get(entity.documentId)?.year ?? new Date(entity.createdAt).getFullYear(),
      specialty: docMap.get(entity.documentId)?.specialty ?? "unknown"
    };
  }
  const reference = match[3];
  const numericValue = extractNumericValue(match[1]);
  const outOfRange = isOutOfRange(numericValue, parseReferenceRange(reference));
  return {
    id: entity.id,
    documentId: entity.documentId,
    testName: entity.label,
    canonicalTestName,
    value: match[1],
    numericValue,
    unit: match[2],
    reference,
    outOfRange,
    date: docMap.get(entity.documentId)?.eventDate ?? entity.createdAt,
    year: docMap.get(entity.documentId)?.year ?? new Date(entity.createdAt).getFullYear(),
    specialty: docMap.get(entity.documentId)?.specialty ?? "unknown"
  };
}

function toDateKey(value: string): string {
  return value.slice(0, 10);
}

function buildLabsHref(current: { focus?: string; pin?: string }, patch: { focus?: string; pin?: string }): string {
  const merged = { ...current, ...patch };
  const params = new URLSearchParams();
  if (merged.focus) {
    params.set("focus", merged.focus);
  }
  if (merged.pin) {
    params.set("pin", merged.pin);
  }
  return params.toString().length > 0 ? `/labs?${params.toString()}` : "/labs";
}

function buildTrendPoints(values: Array<{ x: number; y: number }>, width: number, height: number): string {
  if (values.length === 0) {
    return "";
  }

  const xMin = Math.min(...values.map((point) => point.x));
  const xMax = Math.max(...values.map((point) => point.x));
  const yMin = Math.min(...values.map((point) => point.y));
  const yMax = Math.max(...values.map((point) => point.y));

  return values
    .map((point) => {
      const xNorm = xMax === xMin ? width / 2 : ((point.x - xMin) / (xMax - xMin)) * (width - 20) + 10;
      const yNorm = yMax === yMin ? height / 2 : height - (((point.y - yMin) / (yMax - yMin)) * (height - 20) + 10);
      return `${xNorm.toFixed(1)},${yNorm.toFixed(1)}`;
    })
    .join(" ");
}

export default async function LabsPage({ searchParams }: LabsPageProps): Promise<React.JSX.Element> {
  const params = await searchParams;
  const defaultPinned = ["Tryptase", "CRP"];
  const pinnedTests = (params.pin ?? defaultPinned.join(","))
    .split(",")
    .map((value) => normalizeLabTestName(value))
    .filter(Boolean);
  const currentParams = {
    focus: params.focus,
    pin: params.pin ?? defaultPinned.join(",")
  };

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
    .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));

  // Group by test name for trending
  const testGroups = new Map<string, LabResult[]>();
  for (const result of labResults) {
    const existing = testGroups.get(result.canonicalTestName) ?? [];
    existing.push(result);
    testGroups.set(result.canonicalTestName, existing);
  }

  // Get lab-specific documents for document list
  const labDocuments = labDocs
    .filter(d => d.type.includes("lab") || d.type === "pathology" || d.type === "genetic_test")
    .sort((a, b) => (b.eventDate ?? b.createdAt).localeCompare(a.eventDate ?? a.createdAt));

  // Fallback: represent a lab document as a generic row when no extracted lab entities are present.
  if (labResults.length === 0) {
    for (const doc of labDocuments) {
      const fallbackName = normalizeLabTestName(doc.fileName.split(".")[0] ?? "Lab Panel");
      const fallback: LabResult = {
        id: `${doc.id}-fallback`,
        documentId: doc.id,
        testName: fallbackName,
        canonicalTestName: fallbackName,
        value: "See report",
        numericValue: undefined,
        unit: "",
        reference: "",
        outOfRange: false,
        date: doc.eventDate ?? doc.createdAt,
        year: doc.year,
        specialty: doc.specialty
      };
      labResults.push(fallback);
      const existing = testGroups.get(fallback.canonicalTestName) ?? [];
      existing.push(fallback);
      testGroups.set(fallback.canonicalTestName, existing);
    }
  }

  const uniqueTests = testGroups.size;
  const yearsWithData = [...new Set(labResults.map((result) => result.year))].sort((a, b) => b - a);
  const availableDateKeys = [...new Set(labResults.map((result) => toDateKey(result.date)))].sort((a, b) => a.localeCompare(b));
  const displayedDateKeys = availableDateKeys.slice(-16);
  const focusedTestName = params.focus ? normalizeLabTestName(params.focus) : pinnedTests[0];

  const sortedTestNames = [...testGroups.keys()].sort((a, b) => {
    const aPinned = pinnedTests.includes(a) ? 0 : 1;
    const bPinned = pinnedTests.includes(b) ? 0 : 1;
    if (aPinned !== bPinned) {
      return aPinned - bPinned;
    }
    const aCount = testGroups.get(a)?.length ?? 0;
    const bCount = testGroups.get(b)?.length ?? 0;
    return bCount - aCount;
  });

  const flowsheetRows = sortedTestNames.map((testName) => {
    const results = [...(testGroups.get(testName) ?? [])].sort((a, b) => b.date.localeCompare(a.date));
    const byDate = new Map<string, LabResult>();
    for (const result of results) {
      const key = toDateKey(result.date);
      if (!byDate.has(key)) {
        byDate.set(key, result);
      }
    }
    return { testName, results, byDate };
  });

  const focusedRow = flowsheetRows.find((row) => row.testName === focusedTestName) ?? flowsheetRows[0];
  const focusedSeries = (focusedRow?.results ?? [])
    .filter((result) => result.numericValue !== undefined)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((result) => ({
      date: toDateKey(result.date),
      value: result.numericValue as number
    }));
  const trendPolyline = buildTrendPoints(
    focusedSeries.map((point, index) => ({ x: index + 1, y: point.value })),
    640,
    180
  );

  return (
    <AppShell
      title="Lab Flowsheet"
      subtitle={`${uniqueTests} test types tracked • ${yearsWithData[yearsWithData.length - 1] ?? "N/A"} – ${yearsWithData[0] ?? "N/A"}`}
    >
      <Card title="Longitudinal Flowsheet" detail="Fixed test rows with horizontal date scrolling. Click a test to trend over time.">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.1em] text-[#64748B]">Pinned tests</span>
          {pinnedTests.map((test) => (
            <Link
              key={test}
              href={buildLabsHref(currentParams, { focus: test })}
              className="rounded-full border border-[#93C5FD] bg-[#EFF6FF] px-2 py-1 text-xs font-semibold text-[#1D4ED8]"
            >
              {test}
            </Link>
          ))}
        </div>

        {focusedRow && focusedSeries.length >= 2 && trendPolyline ? (
          <div className="mb-4 rounded-lg border border-[#DBEAFE] bg-[#F8FBFF] p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#1E3A8A]">Trend Overlay: {focusedRow.testName}</p>
            <svg viewBox="0 0 640 180" className="mt-2 h-[180px] w-full">
              <polyline points={trendPolyline} fill="none" stroke="#1D4ED8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              {focusedSeries.map((point, index) => {
                const x = focusedSeries.length === 1 ? 320 : (index / (focusedSeries.length - 1)) * 620 + 10;
                const min = Math.min(...focusedSeries.map((item) => item.value));
                const max = Math.max(...focusedSeries.map((item) => item.value));
                const y = max === min ? 90 : 180 - (((point.value - min) / (max - min)) * 160 + 10);
                return <circle key={`${point.date}-${index}`} cx={x} cy={y} r="3.5" fill="#1D4ED8" />;
              })}
            </svg>
            <div className="mt-2 flex flex-wrap gap-3 text-xs text-[#334155]">
              {focusedSeries.map((point) => (
                <span key={point.date}>
                  {point.date}: <strong>{point.value}</strong>
                </span>
              ))}
            </div>
          </div>
        ) : (
          <div className="mb-4 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-3 text-sm text-[#64748B]">
            Select a test row to render a numeric longitudinal trend.
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="min-w-[980px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-[#CBD5E1] text-left text-xs uppercase tracking-[0.08em] text-[#64748B]">
                <th className="sticky left-0 z-10 bg-white px-2 py-2">Test</th>
                {displayedDateKeys.map((dateKey) => (
                  <th key={dateKey} className="px-2 py-2 text-center">
                    {dateKey}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {flowsheetRows.slice(0, 40).map((row) => (
                <tr key={row.testName} className="border-b border-[#E2E8F0]">
                  <td className="sticky left-0 z-[1] bg-white px-2 py-2">
                    <Link
                      href={buildLabsHref(currentParams, { focus: row.testName })}
                      className={`font-semibold hover:underline ${focusedRow?.testName === row.testName ? "text-[#1D4ED8]" : "text-[#1E293B]"}`}
                    >
                      {row.testName}
                    </Link>
                  </td>
                  {displayedDateKeys.map((dateKey) => {
                    const result = row.byDate.get(dateKey);
                    if (!result) {
                      return (
                        <td key={`${row.testName}-${dateKey}`} className="px-2 py-2 text-center text-xs text-[#94A3B8]">
                          —
                        </td>
                      );
                    }

                    const valueClass = result.outOfRange ? "font-bold text-[#B91C1C]" : "text-[#1E293B]";
                    const content = (
                      <span className={`inline-block rounded px-1.5 py-0.5 ${valueClass}`} title={result.reference ? `Ref: ${result.reference}` : "No reference range"}>
                        {result.value} {result.unit}
                      </span>
                    );

                    return (
                      <td key={`${row.testName}-${dateKey}`} className="px-2 py-2 text-center">
                        <Link href={`/records/${result.documentId}`} className="hover:underline">
                          {content}
                        </Link>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card title="Recent Lab Documents" detail={`${labDocuments.length} total`}>
          <div className="max-h-[480px] space-y-2 overflow-y-auto">
            {labDocuments.slice(0, 24).map((record) => (
              <Link key={record.id} href={`/records/${record.id}`} className="flex items-center justify-between rounded-lg border border-[#E2E8F0] bg-white p-3 hover:bg-[#F8FAFC]">
                <div className="min-w-0">
                  <p className="truncate font-medium text-[#1D4ED8]">{record.fileName}</p>
                  <p className="text-xs text-[#64748B]">
                    {record.specialty.replace(/_/g, " ")} • {record.eventDate?.slice(0, 10) ?? record.year}
                  </p>
                </div>
                <StatusBadge status={record.verificationStatus} />
              </Link>
            ))}
          </div>
        </Card>

        <Card title="Results by Year" detail="Distribution of parsed results">
          <div className="flex flex-wrap gap-3">
            {yearsWithData.map((year) => {
              const count = labResults.filter((result) => result.year === year).length;
              const abnormal = labResults.filter((result) => result.year === year && result.outOfRange).length;
              const abnormalPct = count > 0 ? Math.round((abnormal / count) * 100) : 0;
              return (
                <div key={year} className="rounded-lg border border-[#E2E8F0] bg-white p-4 text-center">
                  <p className="text-2xl font-semibold text-[#1E293B]">{count}</p>
                  <p className="text-sm text-[#64748B]">{year}</p>
                  <p className="text-xs text-[#B91C1C]">{abnormalPct}% out of range</p>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
      {displayedDateKeys.length === 0 && (
        <Card className="mt-4" title="No Flowsheet Data">
          <p className="text-sm text-[#64748B]">
            No structured lab entities were found yet. Ingest and extraction will populate the longitudinal grid.
          </p>
        </Card>
      )}
    </AppShell>
  );
}
