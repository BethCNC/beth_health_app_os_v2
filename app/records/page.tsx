import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { RecordsFilter } from "@/components/records/RecordsFilter";
import { listRecords } from "@/lib/repositories/runtime";
import {
  deriveSystemState,
  deriveSystemTags,
  formatClinicalDate,
  formatSystemLabel,
  formatSystemStateLabel,
  type ClinicalSystemTag
} from "@/lib/utils/clinical-system";
import Link from "next/link";

interface RecordsPageProps {
  searchParams: Promise<{
    query?: string;
    specialty?: string;
    type?: string;
    system?: string;
    year?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
    selected?: string;
  }>;
}

function safeDateValue(value?: string): number {
  if (!value) {
    return 0;
  }
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function createRecordsHref(
  current: {
    query?: string;
    specialty?: string;
    type?: string;
    system?: string;
    year?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
    selected?: string;
  },
  patch: Partial<{
    query?: string;
    specialty?: string;
    type?: string;
    system?: string;
    year?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
    selected?: string;
  }>
): string {
  const merged = { ...current, ...patch };
  const params = new URLSearchParams();
  const entries = Object.entries(merged) as Array<[string, string | undefined]>;

  for (const [key, value] of entries) {
    if (value) {
      params.set(key, value);
    }
  }

  const query = params.toString();
  return query.length > 0 ? `/records?${query}` : "/records";
}

function getImpressionSnippet(input?: string): string {
  if (!input || input.trim().length === 0) {
    return "No extracted impression snippet yet. Open record for full context.";
  }

  const clean = input.replace(/\s+/g, " ").trim();
  if (clean.length <= 140) {
    return clean;
  }
  return `${clean.slice(0, 137)}...`;
}

function statusClassName(state: ReturnType<typeof deriveSystemState>): string {
  if (state === "critical") {
    return "border-[#FECACA] bg-[#FEF2F2] text-[#991B1B]";
  }
  if (state === "reactive") {
    return "border-[#FDE68A] bg-[#FFFBEB] text-[#92400E]";
  }
  if (state === "stable") {
    return "border-[#BBF7D0] bg-[#F0FDF4] text-[#166534]";
  }
  return "border-[#CBD5E1] bg-[#F8FAFC] text-[#334155]";
}

export default async function RecordsPage({ searchParams }: RecordsPageProps): Promise<React.JSX.Element> {
  const params = await searchParams;

  // Build backend-supported filters first.
  const filters = {
    query: params.query,
    specialty: params.specialty,
    type: params.type,
    status: params.status,
    dateFrom: params.dateFrom,
    dateTo: params.dateTo
  };

  const [recordsFromBackend, allRecords] = await Promise.all([listRecords(filters), listRecords({})]);

  const selectedYear = params.year && /^\d{4}$/.test(params.year) ? Number(params.year) : undefined;
  const selectedSystem = params.system;

  // Apply frontend-only facets (system + year) to keep parity across in-memory and Firestore modes.
  const records = recordsFromBackend.filter((record) => {
    if (selectedYear && record.year !== selectedYear) {
      return false;
    }

    if (selectedSystem) {
      const labels = deriveSystemTags(record).map((system) => formatSystemLabel(system));
      if (!labels.includes(selectedSystem)) {
        return false;
      }
    }

    return true;
  });

  const hasFilters = Object.values({
    ...filters,
    system: params.system,
    year: params.year
  }).some(Boolean);

  const selectedRecord = records.find((record) => record.id === params.selected) ?? records[0] ?? null;

  const recordPoolForLead = selectedYear ? allRecords.filter((record) => record.year === selectedYear) : allRecords;
  const leadSystems: ClinicalSystemTag[] = ["immune", "gi", "neuro"];
  const leadStatuses = leadSystems.map((system) => ({
    system,
    state: deriveSystemState(recordPoolForLead, system)
  }));

  const mostRecentRecord = [...recordPoolForLead].sort((a, b) => {
    return safeDateValue(b.eventDate ?? b.createdAt) - safeDateValue(a.eventDate ?? a.createdAt);
  })[0];

  const relatedRecords = selectedRecord?.eventDate
    ? records
        .filter((record) => record.id !== selectedRecord.id && Boolean(record.eventDate))
        .filter((record) => {
          const diffMs = Math.abs(safeDateValue(record.eventDate) - safeDateValue(selectedRecord.eventDate));
          const diffDays = diffMs / (1000 * 60 * 60 * 24);
          return diffDays <= 7;
        })
        .slice(0, 8)
    : [];

  // Extract unique values for filter dropdowns.
  const specialties = [...new Set(allRecords.map((r) => r.specialty))].sort();
  const types = [...new Set(allRecords.map((r) => r.type))].sort();
  const systems = [...new Set(allRecords.flatMap((record) => deriveSystemTags(record).map((system) => formatSystemLabel(system))))].sort();
  const years = [...new Set(allRecords.map((record) => record.year))].sort((a, b) => b - a);
  const yearRange = {
    min: years[years.length - 1] ?? 2018,
    max: years[0] ?? 2026
  };

  const currentParams = {
    query: params.query,
    specialty: params.specialty,
    type: params.type,
    system: params.system,
    year: params.year,
    status: params.status,
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
    selected: params.selected
  };

  return (
    <AppShell
      title="Clinical Console"
      subtitle="Doctor-focused master archive with systemic context and persistent review drawer."
    >
      <section className="mb-4 rounded-xl border border-[#CBD5E1] bg-white px-4 py-4 shadow-sm">
        <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr_1.2fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#475569]">Clinical ID</p>
            <div className="mt-2 flex items-center gap-3">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-[#CBD5E1] bg-[#F8FAFC] text-lg">
                JB
              </span>
              <div>
                <p className="font-semibold text-[#0F172A]">Jennifer Beth Cartrette</p>
                <p className="text-xs text-[#475569]">Age/Sex: 39/F • Blood Type: Unknown</p>
                <p className="text-xs text-[#475569]">Primary Dx: hEDS, MCAS, POTS</p>
              </div>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#475569]">Systemic Status</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {leadStatuses.map((item) => (
                <span
                  key={item.system}
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${statusClassName(item.state)}`}
                >
                  {formatSystemLabel(item.system).toUpperCase()}: {formatSystemStateLabel(item.state)}
                </span>
              ))}
            </div>
            <p className="mt-2 text-xs text-[#64748B]">
              Latest major event: {mostRecentRecord ? `${formatClinicalDate(mostRecentRecord)} - ${mostRecentRecord.fileName}` : "No events"}
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#475569]">Timeline Navigation</p>
            <p className="text-xs text-[#64748B]">Global year range {yearRange.min}-{yearRange.max}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Link
                href={createRecordsHref(currentParams, { year: undefined, selected: undefined })}
                className={`rounded-md border px-2 py-1 text-xs font-semibold ${
                  !selectedYear
                    ? "border-[#1D4ED8] bg-[#DBEAFE] text-[#1D4ED8]"
                    : "border-[#CBD5E1] bg-white text-[#334155]"
                }`}
              >
                All
              </Link>
              {years.map((year) => (
                <Link
                  key={year}
                  href={createRecordsHref(currentParams, { year: String(year), selected: undefined })}
                  className={`rounded-md border px-2 py-1 text-xs font-semibold ${
                    selectedYear === year
                      ? "border-[#1D4ED8] bg-[#DBEAFE] text-[#1D4ED8]"
                      : "border-[#CBD5E1] bg-white text-[#334155]"
                  }`}
                >
                  {year}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="mb-4">
        <RecordsFilter
          specialties={specialties}
          types={types}
          systems={systems}
          years={years}
          initialFilters={{ ...filters, year: params.year, system: params.system }}
        />
      </div>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card
          title={`${records.length} ${records.length === 1 ? "record" : "records"} in master archive`}
          detail={hasFilters ? "Filtered clinical view" : "Full longitudinal archive"}
        >
          {records.length === 0 ? (
            <p className="text-sm text-[#5A697B]">No records match the selected clinical facets.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[980px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-[#CBD5E1] bg-[#F8FAFC] text-left text-xs uppercase tracking-[0.08em] text-[#475569]">
                    <th className="px-2 py-2">Date</th>
                    <th className="px-2 py-2">Type</th>
                    <th className="px-2 py-2">System</th>
                    <th className="px-2 py-2">Title</th>
                    <th className="px-2 py-2">Provider</th>
                    <th className="px-2 py-2">Impression Snippet</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((record) => {
                    const systemLabel = formatSystemLabel(deriveSystemTags(record)[0] ?? "connective");
                    const isSelected = selectedRecord?.id === record.id;
                    return (
                      <tr
                        key={record.id}
                        id={`doc-${record.id}`}
                        className={`border-b border-[#E2E8F0] align-top ${isSelected ? "bg-[#EEF2FF]" : "bg-white"}`}
                      >
                        <td className="whitespace-nowrap px-2 py-2 text-[#334155]">{formatClinicalDate(record)}</td>
                        <td className="whitespace-nowrap px-2 py-2 capitalize text-[#334155]">{record.type.replace(/_/g, " ")}</td>
                        <td className="px-2 py-2">
                          <span className="rounded-full border border-[#CBD5E1] bg-[#F8FAFC] px-2 py-0.5 text-xs text-[#334155]">
                            {systemLabel}
                          </span>
                        </td>
                        <td className="px-2 py-2">
                          <Link
                            href={createRecordsHref(currentParams, { selected: record.id })}
                            className="font-semibold text-[#1D4ED8] hover:underline"
                          >
                            {record.fileName}
                          </Link>
                          <div className="mt-1 max-w-[280px] truncate text-xs text-[#64748B]">{record.sourcePath}</div>
                        </td>
                        <td className="px-2 py-2 text-[#334155]">
                          <p>{record.provider ?? "Unspecified provider"}</p>
                          <StatusBadge status={record.verificationStatus} />
                        </td>
                        <td className="max-w-[340px] px-2 py-2 text-[#475569]">{getImpressionSnippet(record.textPreview)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <aside className="xl:sticky xl:top-4 xl:h-fit">
          <Card title="Preview Drawer" detail="Rapid review without losing archive context">
            {!selectedRecord ? (
              <p className="text-sm text-[#64748B]">Select an archive row to open clinical detail.</p>
            ) : (
              <div className="space-y-4">
                <div className="rounded-lg border border-[#FDE68A] bg-[#FFFBEB] p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#92400E]">Impression Box</p>
                  <p className="mt-2 text-sm text-[#78350F]">{getImpressionSnippet(selectedRecord.textPreview)}</p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#475569]">Evidence Gallery</p>
                  <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
                    {selectedRecord.tags.length > 0 ? (
                      selectedRecord.tags.slice(0, 6).map((tag) => (
                        <div
                          key={tag}
                          className="min-w-[110px] rounded-lg border border-[#CBD5E1] bg-white px-2 py-3 text-center text-xs text-[#334155]"
                        >
                          {tag}
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-[#64748B]">No linked images/evidence for this record.</p>
                    )}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#475569]">Timeline Context (+/- 7 days)</p>
                  {relatedRecords.length === 0 ? (
                    <p className="mt-2 text-sm text-[#64748B]">No related events in the same window.</p>
                  ) : (
                    <ul className="mt-2 space-y-2">
                      {relatedRecords.map((record) => (
                        <li key={record.id} className="rounded-lg border border-[#E2E8F0] bg-white p-2">
                          <p className="text-xs text-[#64748B]">{formatClinicalDate(record)}</p>
                          <p className="text-sm font-medium text-[#1E293B]">{record.fileName}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#475569]">Action Bar</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Link
                      href={`/records/${selectedRecord.id}`}
                      className="rounded-md border border-[#1D4ED8] bg-[#1D4ED8] px-2 py-1 text-xs font-semibold text-white hover:bg-[#1E40AF]"
                    >
                      Open Original
                    </Link>
                    <button
                      type="button"
                      disabled
                      className="rounded-md border border-[#CBD5E1] bg-[#F8FAFC] px-2 py-1 text-xs font-semibold text-[#64748B]"
                    >
                      Download Original
                    </button>
                    <Link
                      href="/verification"
                      className="rounded-md border border-[#DC2626] bg-[#FEF2F2] px-2 py-1 text-xs font-semibold text-[#DC2626] hover:bg-[#FEE2E2]"
                    >
                      Flag for Next Specialist
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </aside>
      </section>
    </AppShell>
  );
}
