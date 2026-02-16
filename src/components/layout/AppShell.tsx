"use client";

import { useState } from "react";
import Sidebar from "./Sidebar";
import PatientHeader from "./PatientHeader";
import WorkspaceTabs from "./WorkspaceTabs";
import Panel from "../ui/Panel";
import KeyValueRow from "../ui/KeyValueRow";
import Badge from "../ui/Badge";
import CompactTable from "../ui/CompactTable";
import {
  getActiveMeds,
  getAllergies,
  getHealthMaintenance,
  getPatientContext,
  getProblemList,
  getRecentLabs,
} from "../../lib/data/dummyRepo";

const tabs = ["Summary", "Timeline", "Labs", "Medications", "Documents"] as const;

type TabKey = (typeof tabs)[number];

type TabContent = {
  title: string;
  body: string;
  highlights: string[];
};

const tabContent: Record<TabKey, TabContent> = {
  Summary: {
    title: "Summary overview",
    body: "Snapshot of key clinical signals and open items.",
    highlights: [
      "Last visit notes pending sign-off",
      "Allergies reviewed in intake",
      "Vitals captured in the past 7 days",
    ],
  },
  Timeline: {
    title: "Timeline feed",
    body: "Chronological chart events for rapid review.",
    highlights: [
      "02/01/2026 - Office visit",
      "01/18/2026 - Lab panel received",
      "12/30/2025 - Medication refill request",
    ],
  },
  Labs: {
    title: "Laboratory results",
    body: "Recent lab values and trends.",
    highlights: [
      "CBC panel pending clinician review",
      "Metabolic panel within range",
      "Next draw scheduled for 03/10/2026",
    ],
  },
  Medications: {
    title: "Medication profile",
    body: "Active prescriptions and adherence notes.",
    highlights: [
      "3 active medications",
      "1 refill due in 14 days",
      "Medication reconciliation required",
    ],
  },
  Documents: {
    title: "Document center",
    body: "Chart attachments and scanned records.",
    highlights: [
      "Referral letter uploaded",
      "Consent form scanned",
      "Pending imaging report",
    ],
  },
};

const patientContext = getPatientContext();
const problemList = getProblemList();
const allergyList = getAllergies();
const activeMeds = getActiveMeds();
const recentLabs = getRecentLabs();
const healthMaintenance = getHealthMaintenance();

const chartNav = [
  "Snapshot",
  "Visits",
  "Results",
  "Imaging",
  "Orders",
  "Care Team",
  "Letters",
  "Billing",
];

export default function AppShell() {
  const [activeTab, setActiveTab] = useState<TabKey>("Summary");
  const activeContent = tabContent[activeTab];
  const isSummary = activeTab === "Summary";
  const lastVisit = patientContext.lastEncounter?.date ?? "N/A";

  return (
    <div className="grid min-h-screen bg-slate-100" style={{ gridTemplateColumns: isSummary ? "1fr" : "240px 1fr" }}>
      {!isSummary && <Sidebar />}
      <section className="flex min-w-0 flex-col">
        <PatientHeader
          name={patientContext.patient.displayName}
          dob={patientContext.patient.dob}
          sexAtBirth={patientContext.patient.sexAtBirth}
          lastVisit={lastVisit}
          activeMeds={String(patientContext.activeMedications)}
          recentLabs={String(patientContext.recentLabs)}
        />
        <WorkspaceTabs
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={(tab) => setActiveTab(tab as TabKey)}
        />
        <main className="flex-1 overflow-auto bg-slate-50">
          {isSummary ? (
            <div className="flex h-full min-w-0">
              <div className="w-[200px] flex-shrink-0 border-r border-slate-200 bg-white p-3">
                <nav className="space-y-0.5 text-[11px]">
                  {chartNav.map((item) => (
                    <div
                      key={item}
                      className={`rounded px-2 py-2 ${
                        item === "Snapshot"
                          ? "bg-slate-300 font-bold text-slate-900"
                          : "text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      {item}
                    </div>
                  ))}
                </nav>
                <div className="mt-4 border-t border-slate-200 pt-4">
                  <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-500">
                    Alerts
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {patientContext.patient.bannerFlags.map((flag) => (
                      <Badge key={flag} label={flag} variant="critical" />
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-auto p-3">
                <div className="grid gap-3 grid-cols-[1fr_280px]">
                  <div className="space-y-3">
                    <Panel title="Demographics" category="demographics">
                      <div className="space-y-1">
                        <KeyValueRow
                          label="Preferred name"
                          value={patientContext.patient.preferredName ?? "—"}
                        />
                        <KeyValueRow label="DOB" value={patientContext.patient.dob} />
                        <KeyValueRow
                          label="Sex at birth"
                          value={patientContext.patient.sexAtBirth}
                        />
                        <KeyValueRow
                          label="Last encounter"
                          value={`${lastVisit}`}
                        />
                        <KeyValueRow
                          label="Clinic"
                          value={patientContext.lastEncounter?.location ?? "—"}
                        />
                      </div>
                    </Panel>

                    <Panel title="Problem List" subtitle="Chronic" category="problems">
                      <CompactTable
                        variant="spreadsheet"
                        columns={[
                          { key: "problem", label: "Problem", width: "w-1/2" },
                          { key: "status", label: "Status" },
                          { key: "onset", label: "Onset" },
                        ]}
                        rows={problemList.map((item) => ({
                          id: item.id,
                          problem: item.problem,
                          status: (
                            <span className="font-semibold text-amber-700">
                              {item.status}
                            </span>
                          ),
                          onset: item.onset,
                        }))}
                      />
                    </Panel>

                    <Panel title="Recent Labs" subtitle="Last results" category="labs">
                      <CompactTable
                        variant="spreadsheet"
                        columns={[
                          { key: "test", label: "Test", width: "w-1/3" },
                          { key: "value", label: "Value", width: "w-1/4" },
                          { key: "range", label: "Ref Range", width: "w-1/4" },
                          { key: "flag", label: "Flag", align: "center", width: "w-1/6" },
                        ]}
                        rows={recentLabs.map((lab) => {
                          let flagVariant: "neutral" | "warning" | "critical" =
                            "neutral";
                          let flagBg = "";
                          if (lab.status === "High") {
                            flagVariant = "warning";
                            flagBg = "bg-yellow-200";
                          } else if (lab.status === "Low") {
                            flagVariant = "warning";
                            flagBg = "bg-yellow-200";
                          } else if (lab.status === "Abnormal") {
                            flagVariant = "critical";
                            flagBg = "bg-red-200";
                          }

                          return {
                            id: lab.id,
                            test: lab.name,
                            value: (
                              <span className="font-semibold text-slate-800">
                                {lab.value}
                              </span>
                            ),
                            range: (
                              <span className="text-slate-600">{lab.referenceRange}</span>
                            ),
                            flag:
                              lab.status !== "Normal" ? (
                                <span
                                  className={`inline-block rounded px-2 py-0.5 text-[10px] font-bold text-slate-800 ${flagBg}`}
                                >
                                  {lab.status}
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-500">—</span>
                              ),
                          };
                        })}
                      />
                    </Panel>
                  </div>

                  <div className="space-y-3">
                    <Panel title="Allergies" category="allergies">
                      <div className="space-y-2 text-[11px]">
                        {allergyList.map((allergy) => (
                          <div key={allergy.id} className="border-l-2 border-rose-300 bg-rose-50 px-2 py-1.5">
                            <div className="font-bold text-rose-900">{allergy.agent}</div>
                            <div className="text-[10px] text-rose-700">
                              {allergy.reaction}
                            </div>
                            <div className="mt-1">
                              <Badge
                                label={allergy.severity}
                                variant={
                                  allergy.severity === "Severe"
                                    ? "critical"
                                    : allergy.severity === "Moderate"
                                      ? "warning"
                                      : "neutral"
                                }
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </Panel>

                    <Panel title="Medications" subtitle="Active Rx" category="medications">
                      <div className="space-y-1.5 text-[11px]">
                        {activeMeds.map((med) => (
                          <div
                            key={med.id}
                            className="border-l-2 border-blue-300 bg-blue-50 px-2 py-1.5"
                          >
                            <div className="font-bold text-blue-900">
                              {med.name} {med.dose}
                            </div>
                            <div className="text-[10px] text-blue-700">
                              {med.route} · {med.schedule}
                            </div>
                          </div>
                        ))}
                      </div>
                    </Panel>

                    <Panel title="Health Maintenance" category="maintenance">
                      <CompactTable
                        variant="spreadsheet"
                        columns={[
                          { key: "topic", label: "Topic" },
                          { key: "status", label: "Status", align: "center" },
                          { key: "due", label: "Due" },
                        ]}
                        rows={healthMaintenance.map((item) => ({
                          id: item.id,
                          topic: item.topic,
                          status: (
                            <Badge
                              label={item.status}
                              variant={
                                item.status === "Overdue"
                                  ? "critical"
                                  : item.status === "Due"
                                    ? "warning"
                                    : "neutral"
                              }
                            />
                          ),
                          due: item.due,
                        }))}
                      />
                    </Panel>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="max-w-3xl rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <div className="text-xs uppercase tracking-[0.2em] text-slate-400">
                {activeTab}
              </div>
              <div className="mt-2 text-base font-semibold text-slate-900">
                {activeContent.title}
              </div>
              <div className="mt-2 text-sm text-slate-600">
                {activeContent.body}
              </div>
              <div className="mt-4 space-y-2 text-sm text-slate-700">
                {activeContent.highlights.map((item) => (
                  <div key={item} className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-500" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </section>
    </div>
  );
}
