import React from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { getClinicalSnapshot, getDocumentsByIds } from "@/lib/repositories/runtime";
import type { SnapshotSectionItem } from "@/lib/types/domain";

interface SectionProps {
  title: string;
  items: SnapshotSectionItem[];
  emptyMessage?: string;
  variant?: "default" | "alert" | "subtle";
}

async function SnapshotSection({ title, items, emptyMessage, variant = "default" }: SectionProps): Promise<React.JSX.Element> {
  if (items.length === 0) {
    return (
      <Card title={title}>
        <p className="text-sm text-muted">{emptyMessage ?? "No data available."}</p>
      </Card>
    );
  }

  // Fetch document details for citations
  const docIds = items.flatMap((item) => item.sourceDocumentIds);
  const documents = docIds.length > 0 ? await getDocumentsByIds(docIds) : [];
  const docMap = new Map(documents.map((doc) => [doc.id, doc]));

  const borderClass = variant === "alert"
    ? "border-l-4 border-l-[#EF4444]"
    : variant === "subtle"
      ? "border-l-4 border-l-[#94A3B8]"
      : "";

  return (
    <Card title={title}>
      <ul className="space-y-3">
        {items.map((item, index) => (
          <li
            key={`${item.label}-${index}`}
            className={`rounded-lg border border-[#CCD3DD] bg-white p-3 ${borderClass}`}
          >
            <div className="flex items-start justify-between gap-2">
              <p className="font-medium text-[#1E293B]">{item.label}</p>
              {item.sourceDocumentIds.length > 0 && (
                <span className="shrink-0 rounded bg-[#F1F5F9] px-2 py-0.5 text-xs text-muted">
                  {item.sourceDocumentIds.length} source{item.sourceDocumentIds.length !== 1 ? "s" : ""}
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-[#475569]">{item.value}</p>
            {item.sourceDocumentIds.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {item.sourceDocumentIds.map((docId) => {
                  const doc = docMap.get(docId);
                  return (
                    <Link
                      key={docId}
                      href={`/records/${docId}`}
                      className="inline-flex items-center gap-1 rounded bg-[#EEF2FF] px-2 py-0.5 text-xs text-[#4338CA] hover:bg-[#E0E7FF]"
                    >
                      📄 {doc?.fileName ?? docId}
                    </Link>
                  );
                })}
              </div>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}

export default async function SnapshotPage(): Promise<React.JSX.Element> {
  const snapshot = await getClinicalSnapshot();

  return (
    <AppShell
      title="Clinical Snapshot"
      subtitle="One-page summary of active conditions, medications, and recent events."
    >
      {/* Print timestamp */}
      <div className="mb-4 flex items-center justify-between rounded-lg border border-[#E0E7FF] bg-[#EEF2FF] px-4 py-2">
        <span className="text-sm text-[#4338CA]">
          Generated: {new Date(snapshot.generatedAt).toLocaleString()}
        </span>
        <StatusBadge status="snapshot" />
      </div>

      {/* Primary clinical context - 2 column grid */}
      <div className="grid gap-4 lg:grid-cols-2">
        <SnapshotSection
          title="Active Conditions"
          items={snapshot.activeConditions}
          emptyMessage="No active conditions documented."
        />
        <SnapshotSection
          title="Current Medications"
          items={snapshot.medications}
          emptyMessage="No medications on file. Verify with recent records."
        />
      </div>

      {/* Allergies - full width for visibility */}
      <div className="mt-4">
        <SnapshotSection
          title="Allergies & Sensitivities"
          items={snapshot.allergies}
          emptyMessage="No known allergies documented."
          variant="alert"
        />
      </div>

      {/* Critical results and recent events */}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <SnapshotSection
          title="Recent Critical Results"
          items={snapshot.recentCriticalResults}
          emptyMessage="No critical results in recent period."
          variant="alert"
        />
        <SnapshotSection
          title="Recent Clinical Events"
          items={snapshot.recentEvents}
          emptyMessage="No recent events."
        />
      </div>

      {/* Appointments and changes */}
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <SnapshotSection
          title="Upcoming Appointments"
          items={snapshot.upcomingAppointments}
          emptyMessage="No appointments scheduled."
          variant="subtle"
        />
        <SnapshotSection
          title="Changes (Last 30 Days)"
          items={snapshot.changesLast30Days}
          emptyMessage="No changes in last 30 days."
        />
        <SnapshotSection
          title="Changes (Last 90 Days)"
          items={snapshot.changesLast90Days}
          emptyMessage="No changes in last 90 days."
        />
      </div>

      {/* Quick actions footer */}
      <div className="mt-6 flex flex-wrap gap-3 rounded-lg border border-[#CCD3DD] bg-[#F8FAFC] p-4">
        <Link
          href="/timeline"
          className="rounded-lg border border-[#1D4ED8] bg-[#1D4ED8] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1E40AF]"
        >
          View Full Timeline
        </Link>
        <Link
          href="/records"
          className="rounded-lg border border-[#D1D7E0] bg-white px-4 py-2 text-sm font-semibold text-[#374151] hover:bg-[#F8FAFC]"
        >
          Browse All Records
        </Link>
      </div>
    </AppShell>
  );
}
