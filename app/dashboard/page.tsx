import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { getClinicalSnapshot, listRecords, listVerificationTasks } from "@/lib/repositories/store";
import Link from "next/link";

export default function DashboardPage(): React.JSX.Element {
  const snapshot = getClinicalSnapshot();
  const recentRecords = listRecords({}).slice(0, 6);
  const pendingTasks = listVerificationTasks().filter((task) => task.status === "pending");

  return (
    <AppShell
      title="Clinical Command Dashboard"
      subtitle="Fast handoff context for specialists with clear verification boundaries and citation-ready records."
    >
      <section className="grid gap-4 md:grid-cols-3">
        <Card title="Pending verification" detail="All extracted fields require review before trust.">
          <p className="text-3xl font-semibold">{pendingTasks.length}</p>
          <Link href="/verification" className="mt-3 inline-block text-sm font-semibold text-[#1D4ED8] hover:underline">
            Review queue
          </Link>
        </Card>
        <Card title="Recent records" detail="Most recent imports across all specialties.">
          <p className="text-3xl font-semibold">{recentRecords.length}</p>
        </Card>
        <Card title="Snapshot generated" detail="Clinician one-page briefing status.">
          <p className="text-sm font-medium">{new Date(snapshot.generatedAt).toLocaleString()}</p>
        </Card>
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card title="Recent clinical events" detail="Cross-specialty timeline highlights.">
          <ul className="space-y-3">
            {snapshot.recentEvents.map((item) => (
              <li key={item.label} className="rounded-lg border border-[#CCD3DD] bg-white p-3">
                <p className="font-medium">{item.label}</p>
                <p className="mt-1 text-sm text-muted">{item.value}</p>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Latest imported files" detail="Focus currently tuned to 2025 and 2026 datasets.">
          <ul className="space-y-2">
            {recentRecords.map((record) => (
              <li key={record.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#CCD3DD] bg-white p-3">
                <div>
                  <Link className="font-medium text-[#1D4ED8] hover:underline" href={`/records/${record.id}`}>
                    {record.fileName}
                  </Link>
                  <p className="text-xs text-muted">
                    {record.specialty} • {record.year}
                  </p>
                </div>
                <StatusBadge status={record.verificationStatus} />
              </li>
            ))}
          </ul>
        </Card>
      </section>
    </AppShell>
  );
}
