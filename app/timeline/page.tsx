import React from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { listTimeline, getDocumentsByIds, listAllExtractedEntities } from "@/lib/repositories/runtime";
import { TimelineFilter } from "@/components/timeline/TimelineFilter";
import type { ClinicalEvent, ClinicalEpisode, ExtractedEntity } from "@/lib/types/domain";

interface PageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

type EntityType = ExtractedEntity["type"];

const entityTypeConfig: Record<EntityType, { icon: string; label: string; bgColor: string; textColor: string }> = {
  diagnosis: { icon: "🩺", label: "Diagnosis", bgColor: "bg-[#FEF3C7]", textColor: "text-[#92400E]" },
  lab: { icon: "🧪", label: "Lab", bgColor: "bg-[#DBEAFE]", textColor: "text-[#1E40AF]" },
  medication: { icon: "💊", label: "Medication", bgColor: "bg-[#F3E8FF]", textColor: "text-[#7E22CE]" },
  procedure: { icon: "⚕️", label: "Procedure", bgColor: "bg-[#DCFCE7]", textColor: "text-[#166534]" },
  finding: { icon: "🔍", label: "Finding", bgColor: "bg-[#FEE2E2]", textColor: "text-[#991B1B]" }
};

function EntityChip({ entity }: { entity: ExtractedEntity }): React.JSX.Element {
  const config = entityTypeConfig[entity.type] ?? { icon: "📝", label: entity.type, bgColor: "bg-[#F1F5F9]", textColor: "text-[#475569]" };
  
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${config.bgColor} ${config.textColor}`}>
      <span>{config.icon}</span>
      <span className="max-w-[180px] truncate" title={entity.value}>{entity.label || entity.value}</span>
    </span>
  );
}

function EventTypeIcon({ type }: { type: ClinicalEvent["type"] }): React.JSX.Element {
  const iconClass = "h-4 w-4";
  switch (type) {
    case "lab_result":
      return <span className={iconClass} title="Lab Result">🧪</span>;
    case "imaging_result":
      return <span className={iconClass} title="Imaging">🔬</span>;
    case "appointment":
      return <span className={iconClass} title="Appointment">📅</span>;
    case "procedure":
      return <span className={iconClass} title="Procedure">⚕️</span>;
    case "flare":
      return <span className={iconClass} title="Flare">🔥</span>;
    default:
      return <span className={iconClass} title="Note">📝</span>;
  }
}

function SeverityBadge({ severity }: { severity: ClinicalEpisode["severity"] }): React.JSX.Element {
  const colors = {
    mild: "bg-[#E7F9EE] text-[#1E6A3E] border-[#A9DFC2]",
    moderate: "bg-[#FFF8E8] text-[#916211] border-[#E8D3A1]",
    severe: "bg-[#FDF1F1] text-[#9B2323] border-[#F4B1B1]"
  };

  return (
    <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${colors[severity]}`}>
      {severity}
    </span>
  );
}

interface MonthWindow {
  key: string;
  label: string;
  from: string;
  to: string;
}

function toMonthWindow(key: string): MonthWindow {
  const [yearString, monthString] = key.split("-");
  const year = Number(yearString);
  const month = Number(monthString);
  const monthEndDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const label = new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
    timeZone: "UTC"
  });

  return {
    key,
    label,
    from: `${key}-01`,
    to: `${key}-${String(monthEndDay).padStart(2, "0")}`
  };
}

function buildTimelineHref(
  current: Record<string, string | undefined>,
  patch: Record<string, string | undefined>
): string {
  const merged = { ...current, ...patch };
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(merged)) {
    if (value) {
      params.set(key, value);
    }
  }

  const query = params.toString();
  return query.length > 0 ? `/timeline?${query}` : "/timeline";
}

function buildRecordsSyncHref(
  current: Record<string, string | undefined>,
  range?: { from?: string; to?: string }
): string {
  const params = new URLSearchParams();
  if (range?.from) {
    params.set("dateFrom", range.from);
  }
  if (range?.to) {
    params.set("dateTo", range.to);
  }
  if (current.specialty) {
    params.set("specialty", current.specialty);
  }
  if (current.condition) {
    params.set("query", current.condition);
  }
  return params.toString().length > 0 ? `/records?${params.toString()}` : "/records";
}

function intensityClass(value: number, max: number, palette: [string, string, string]): string {
  if (value <= 0 || max <= 0) {
    return "bg-[#F8FAFC] text-[#64748B]";
  }

  const ratio = value / max;
  if (ratio > 0.72) {
    return `${palette[2]} text-white`;
  }
  if (ratio > 0.4) {
    return `${palette[1]} text-[#1E293B]`;
  }
  return `${palette[0]} text-[#1E293B]`;
}

export default async function TimelinePage({ searchParams }: PageProps): Promise<React.JSX.Element> {
  const params = await searchParams;

  const filters = {
    from: params.from,
    to: params.to,
    condition: params.condition,
    type: params.type,
    specialty: params.specialty,
    episodeId: params.episodeId,
    verified: params.verified === "true" ? true : params.verified === "false" ? false : undefined
  };

  // Fetch timeline data and all entities in parallel
  const [data, allEntities] = await Promise.all([
    listTimeline(filters),
    listAllExtractedEntities()
  ]);

  // Fetch document details for all events
  const allDocIds = data.events.flatMap((e) => e.documentIds);
  const documents = allDocIds.length > 0 ? await getDocumentsByIds(allDocIds) : [];
  const docMap = new Map(documents.map((doc) => [doc.id, doc]));

  // Build entity map by document ID
  const entitiesByDocId = new Map<string, ExtractedEntity[]>();
  for (const entity of allEntities) {
    const existing = entitiesByDocId.get(entity.documentId) ?? [];
    existing.push(entity);
    entitiesByDocId.set(entity.documentId, existing);
  }

  // Aggregate entity stats for the current timeline view
  const timelineDocIds = new Set(allDocIds);
  const timelineEntities = allEntities.filter(e => timelineDocIds.has(e.documentId));
  const entityStats = {
    diagnoses: timelineEntities.filter(e => e.type === "diagnosis").length,
    labs: timelineEntities.filter(e => e.type === "lab").length,
    medications: timelineEntities.filter(e => e.type === "medication").length,
    procedures: timelineEntities.filter(e => e.type === "procedure").length,
    findings: timelineEntities.filter(e => e.type === "finding").length
  };

  const currentParams: Record<string, string | undefined> = {
    from: params.from,
    to: params.to,
    condition: params.condition,
    type: params.type,
    specialty: params.specialty,
    episodeId: params.episodeId,
    verified: params.verified
  };

  const monthWindows = [...new Set(data.events.map((event) => event.eventDate.slice(0, 7)))]
    .sort((a, b) => b.localeCompare(a))
    .map((key) => toMonthWindow(key));
  const displayedMonths = monthWindows.slice(0, 12).reverse();

  const monthStats = new Map<string, { flare: number; meds: number; interventions: number; vitals: number }>();
  for (const month of displayedMonths) {
    monthStats.set(month.key, { flare: 0, meds: 0, interventions: 0, vitals: 0 });
  }

  for (const event of data.events) {
    const monthKey = event.eventDate.slice(0, 7);
    const stats = monthStats.get(monthKey);
    if (!stats) {
      continue;
    }

    if (event.type === "flare") {
      stats.flare += 1;
    }
    if (event.type === "procedure" || event.type === "imaging_result") {
      stats.interventions += 1;
    }

    const medCount = event.documentIds.reduce((count, docId) => {
      const entities = entitiesByDocId.get(docId) ?? [];
      return count + entities.filter((entity) => entity.type === "medication").length;
    }, 0);
    stats.meds += medCount;

    const hasVitalsSignal = event.documentIds.some((docId) => {
      const doc = docMap.get(docId);
      if (!doc) {
        return false;
      }
      const tagText = doc.tags.join(" ").toLowerCase();
      return ["hr", "bp", "heart rate", "tachy", "hypotension", "vitals", "pulse"].some((keyword) =>
        tagText.includes(keyword)
      );
    });
    if (hasVitalsSignal) {
      stats.vitals += 1;
    }
  }

  const trackMax = {
    flare: Math.max(1, ...[...monthStats.values()].map((value) => value.flare)),
    meds: Math.max(1, ...[...monthStats.values()].map((value) => value.meds)),
    interventions: Math.max(1, ...[...monthStats.values()].map((value) => value.interventions)),
    vitals: Math.max(1, ...[...monthStats.values()].map((value) => value.vitals))
  };

  const activeWindow =
    params.from && params.to
      ? { from: params.from, to: params.to, label: `${params.from} to ${params.to}` }
      : null;
  const fallbackWindow = monthWindows[0] ? { from: monthWindows[0].from, to: monthWindows[0].to, label: monthWindows[0].label } : null;
  const syncWindow = activeWindow ?? fallbackWindow;
  const syncArchiveHref = buildRecordsSyncHref(currentParams, syncWindow ?? undefined);

  return (
    <AppShell
      title="Clinical Timeline"
      subtitle="Event chronology with extracted clinical data from source documents."
    >
      {/* Filters */}
      <TimelineFilter />

      {/* Entity summary for this timeline view */}
      <div className="mt-4 flex flex-wrap gap-3">
        {entityStats.diagnoses > 0 && (
          <div className="flex items-center gap-2 rounded-lg border border-[#FDE68A] bg-[#FFFBEB] px-3 py-2">
            <span>🩺</span>
            <span className="text-sm font-medium text-[#92400E]">{entityStats.diagnoses} Diagnoses</span>
          </div>
        )}
        {entityStats.labs > 0 && (
          <div className="flex items-center gap-2 rounded-lg border border-[#93C5FD] bg-[#EFF6FF] px-3 py-2">
            <span>🧪</span>
            <span className="text-sm font-medium text-[#1E40AF]">{entityStats.labs} Lab Results</span>
          </div>
        )}
        {entityStats.medications > 0 && (
          <div className="flex items-center gap-2 rounded-lg border border-[#D8B4FE] bg-[#FAF5FF] px-3 py-2">
            <span>💊</span>
            <span className="text-sm font-medium text-[#7E22CE]">{entityStats.medications} Medications</span>
          </div>
        )}
        {entityStats.procedures > 0 && (
          <div className="flex items-center gap-2 rounded-lg border border-[#86EFAC] bg-[#F0FDF4] px-3 py-2">
            <span>⚕️</span>
            <span className="text-sm font-medium text-[#166534]">{entityStats.procedures} Procedures</span>
          </div>
        )}
        {entityStats.findings > 0 && (
          <div className="flex items-center gap-2 rounded-lg border border-[#FCA5A5] bg-[#FEF2F2] px-3 py-2">
            <span>🔍</span>
            <span className="text-sm font-medium text-[#991B1B]">{entityStats.findings} Findings</span>
          </div>
        )}
      </div>

      <Card
        className="mt-4"
        title="Visual Timeline (Event Correlation)"
        detail="Zoom by month and sync the same window to the master archive."
      >
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-[#64748B]">
            Active window: {syncWindow ? syncWindow.label : "No date window selected"}
          </p>
          <Link
            href={syncArchiveHref}
            className="rounded-md border border-[#1D4ED8] bg-[#EEF2FF] px-3 py-1 text-xs font-semibold text-[#1D4ED8] hover:bg-[#E0E7FF]"
          >
            Sync Master Archive
          </Link>
        </div>

        {displayedMonths.length === 0 ? (
          <p className="text-sm text-muted">No timeline data available for month-level correlation yet.</p>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {monthWindows.slice(0, 12).map((month) => {
                const selected = params.from === month.from && params.to === month.to;
                return (
                  <Link
                    key={month.key}
                    href={buildTimelineHref(currentParams, { from: month.from, to: month.to })}
                    className={`rounded-md border px-2 py-1 text-xs font-semibold ${
                      selected
                        ? "border-[#1D4ED8] bg-[#DBEAFE] text-[#1D4ED8]"
                        : "border-[#CBD5E1] bg-white text-[#334155] hover:bg-[#F8FAFC]"
                    }`}
                  >
                    {month.label}
                  </Link>
                );
              })}
              {(params.from || params.to) && (
                <Link
                  href={buildTimelineHref(currentParams, { from: undefined, to: undefined })}
                  className="rounded-md border border-[#CBD5E1] bg-white px-2 py-1 text-xs font-semibold text-[#334155] hover:bg-[#F8FAFC]"
                >
                  Clear Zoom
                </Link>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-[760px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-[#CBD5E1] text-left text-xs uppercase tracking-[0.08em] text-[#64748B]">
                    <th className="px-2 py-2">Track</th>
                    {displayedMonths.map((month) => (
                      <th key={month.key} className="px-2 py-2 text-center">
                        {month.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-[#E2E8F0]">
                    <td className="px-2 py-2 font-medium text-[#334155]">Flare Intensity</td>
                    {displayedMonths.map((month) => {
                      const value = monthStats.get(month.key)?.flare ?? 0;
                      return (
                        <td key={month.key} className="px-1 py-1 text-center">
                          <Link
                            href={buildTimelineHref(currentParams, { from: month.from, to: month.to })}
                            className={`block rounded px-2 py-2 text-xs font-semibold ${intensityClass(value, trackMax.flare, [
                              "bg-[#DCFCE7]",
                              "bg-[#FDE68A]",
                              "bg-[#F97316]"
                            ])}`}
                            title={`${value} flare event(s)`}
                          >
                            {value || "0"}
                          </Link>
                        </td>
                      );
                    })}
                  </tr>

                  <tr className="border-b border-[#E2E8F0]">
                    <td className="px-2 py-2 font-medium text-[#334155]">Medication Log</td>
                    {displayedMonths.map((month) => {
                      const value = monthStats.get(month.key)?.meds ?? 0;
                      return (
                        <td key={month.key} className="px-1 py-1 text-center">
                          <Link
                            href={buildTimelineHref(currentParams, { from: month.from, to: month.to })}
                            className={`block rounded px-2 py-2 text-xs font-semibold ${intensityClass(value, trackMax.meds, [
                              "bg-[#DBEAFE]",
                              "bg-[#93C5FD]",
                              "bg-[#2563EB]"
                            ])}`}
                            title={`${value} medication entity signal(s)`}
                          >
                            {value || "0"}
                          </Link>
                        </td>
                      );
                    })}
                  </tr>

                  <tr className="border-b border-[#E2E8F0]">
                    <td className="px-2 py-2 font-medium text-[#334155]">Interventions</td>
                    {displayedMonths.map((month) => {
                      const value = monthStats.get(month.key)?.interventions ?? 0;
                      return (
                        <td key={month.key} className="px-1 py-1 text-center">
                          <Link
                            href={buildTimelineHref(currentParams, { from: month.from, to: month.to })}
                            className={`block rounded px-2 py-2 text-xs font-semibold ${intensityClass(
                              value,
                              trackMax.interventions,
                              ["bg-[#EDE9FE]", "bg-[#C4B5FD]", "bg-[#7C3AED]"]
                            )}`}
                            title={`${value} interventions`}
                          >
                            {value || "0"}
                          </Link>
                        </td>
                      );
                    })}
                  </tr>

                  <tr>
                    <td className="px-2 py-2 font-medium text-[#334155]">Vitals Signal</td>
                    {displayedMonths.map((month) => {
                      const value = monthStats.get(month.key)?.vitals ?? 0;
                      return (
                        <td key={month.key} className="px-1 py-1 text-center">
                          <Link
                            href={buildTimelineHref(currentParams, { from: month.from, to: month.to })}
                            className={`block rounded px-2 py-2 text-xs font-semibold ${intensityClass(value, trackMax.vitals, [
                              "bg-[#F1F5F9]",
                              "bg-[#CBD5E1]",
                              "bg-[#475569]"
                            ])}`}
                            title={`${value} vitals-related signals`}
                          >
                            {value || "0"}
                          </Link>
                        </td>
                      );
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Card>

      <section className="mt-4 grid gap-4 lg:grid-cols-[2fr_1fr]">
        {/* Events column */}
        <Card title="Events" detail={`${data.events.length} events • Sorted latest-first`}>
          {data.events.length === 0 ? (
            <p className="text-sm text-muted">No events match the current filters.</p>
          ) : (
            <ol className="space-y-4">
              {data.events.map((event) => {
                // Get entities for all documents linked to this event
                const eventEntities: ExtractedEntity[] = [];
                for (const docId of event.documentIds) {
                  const docEntities = entitiesByDocId.get(docId) ?? [];
                  eventEntities.push(...docEntities);
                }
                
                // Group by type for display
                const diagnoses = eventEntities.filter(e => e.type === "diagnosis");
                const labs = eventEntities.filter(e => e.type === "lab");
                const medications = eventEntities.filter(e => e.type === "medication");
                const procedures = eventEntities.filter(e => e.type === "procedure");
                const findings = eventEntities.filter(e => e.type === "finding");
                const hasEntities = eventEntities.length > 0;

                return (
                  <li
                    key={event.id}
                    className={`rounded-lg border bg-white p-4 ${
                      event.verified ? "border-[#A9DFC2]" : "border-[#CCD3DD]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <EventTypeIcon type={event.type} />
                        <p className="font-semibold text-[#1E293B]">{event.title}</p>
                      </div>
                      <StatusBadge status={event.verified ? "verified" : "pending"} />
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted">
                      <span>{event.eventDate.slice(0, 10)}</span>
                      <span>•</span>
                      <span className="capitalize">{event.specialty.replace(/_/g, " ")}</span>
                      {event.conditions.length > 0 && (
                        <>
                          <span>•</span>
                          <span>{event.conditions.join(", ")}</span>
                        </>
                      )}
                    </div>

                    <p className="mt-3 text-sm text-[#475569]">{event.summary}</p>

                    {/* Entity overlay */}
                    {hasEntities && (
                      <div className="mt-3 space-y-2 border-t border-[#E2E8F0] pt-3">
                        <p className="text-xs font-medium text-[#64748B]">Extracted Data</p>
                        
                        {diagnoses.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {diagnoses.slice(0, 5).map((e, i) => (
                              <EntityChip key={`dx-${i}`} entity={e} />
                            ))}
                            {diagnoses.length > 5 && (
                              <span className="text-xs text-[#64748B]">+{diagnoses.length - 5} more</span>
                            )}
                          </div>
                        )}
                        
                        {labs.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {labs.slice(0, 5).map((e, i) => (
                              <EntityChip key={`lab-${i}`} entity={e} />
                            ))}
                            {labs.length > 5 && (
                              <span className="text-xs text-[#64748B]">+{labs.length - 5} more</span>
                            )}
                          </div>
                        )}
                        
                        {medications.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {medications.slice(0, 4).map((e, i) => (
                              <EntityChip key={`med-${i}`} entity={e} />
                            ))}
                            {medications.length > 4 && (
                              <span className="text-xs text-[#64748B]">+{medications.length - 4} more</span>
                            )}
                          </div>
                        )}
                        
                        {procedures.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {procedures.slice(0, 3).map((e, i) => (
                              <EntityChip key={`proc-${i}`} entity={e} />
                            ))}
                            {procedures.length > 3 && (
                              <span className="text-xs text-[#64748B]">+{procedures.length - 3} more</span>
                            )}
                          </div>
                        )}
                        
                        {findings.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {findings.slice(0, 4).map((e, i) => (
                              <EntityChip key={`find-${i}`} entity={e} />
                            ))}
                            {findings.length > 4 && (
                              <span className="text-xs text-[#64748B]">+{findings.length - 4} more</span>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Document links */}
                    {event.documentIds.length > 0 && (
                      <div className="mt-3 border-t border-[#E2E8F0] pt-3">
                        <p className="mb-2 text-xs font-medium text-muted">
                          Source Documents ({event.documentIds.length})
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {event.documentIds.map((docId) => {
                            const doc = docMap.get(docId);
                            const docEntityCount = entitiesByDocId.get(docId)?.length ?? 0;
                            return (
                              <Link
                                key={docId}
                                href={`/records/${docId}`}
                                className="inline-flex items-center gap-1 rounded bg-[#EEF2FF] px-2 py-1 text-xs text-[#4338CA] hover:bg-[#E0E7FF]"
                              >
                                📄 {doc?.fileName ?? docId}
                                {docEntityCount > 0 && (
                                  <span className="rounded-full bg-[#4338CA] px-1.5 text-[10px] text-white">
                                    {docEntityCount}
                                  </span>
                                )}
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
          )}
        </Card>

        {/* Episodes column */}
        <Card title="Episodes" detail={`${data.episodes.length} active episodes`}>
          {data.episodes.length === 0 ? (
            <p className="text-sm text-muted">No episodes match the current filters.</p>
          ) : (
            <ul className="space-y-4">
              {data.episodes.map((episode) => (
                <li
                  key={episode.id}
                  className="rounded-lg border border-[#CCD3DD] bg-white p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-[#1E293B]">{episode.label}</p>
                    <SeverityBadge severity={episode.severity} />
                  </div>

                  <p className="mt-2 text-xs text-muted">
                    {episode.startDate.slice(0, 10)} → {episode.endDate ? episode.endDate.slice(0, 10) : "ongoing"}
                  </p>

                  {episode.conditionFocus.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {episode.conditionFocus.map((condition) => (
                        <span
                          key={condition}
                          className="rounded bg-[#F1F5F9] px-2 py-0.5 text-xs text-[#475569]"
                        >
                          {condition}
                        </span>
                      ))}
                    </div>
                  )}

                  <p className="mt-2 text-xs text-muted">
                    {episode.eventIds.length} event{episode.eventIds.length !== 1 ? "s" : ""}
                  </p>

                  <Link
                    href={`/timeline?episodeId=${episode.id}`}
                    className="mt-2 inline-block text-xs font-medium text-[#1D4ED8] hover:underline"
                  >
                    View episode events →
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>
    </AppShell>
  );
}
