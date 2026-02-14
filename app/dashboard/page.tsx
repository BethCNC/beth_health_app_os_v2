import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { getClinicalSnapshot, listRecords, listVerificationTasks } from "@/lib/repositories/runtime";
import Link from "next/link";

export default async function DashboardPage(): Promise<React.JSX.Element> {
  // Fetch all data in parallel
  const [snapshot, allRecords, pendingTasksRaw] = await Promise.all([
    getClinicalSnapshot(),
    listRecords({}),
    listVerificationTasks()
  ]);

  const recentRecords = allRecords.slice(0, 6);
  const pendingTasks = pendingTasksRaw.filter((task) => task.status === "pending");

  // Calculate actionable stats
  const totalDocs = allRecords.length;
  const verifiedCount = allRecords.filter(d => d.verificationStatus === "verified").length;
  const unverifiedCount = allRecords.filter(d => d.verificationStatus === "unverified").length;
  const verificationPct = totalDocs > 0 ? Math.round((verifiedCount / totalDocs) * 100) : 0;
  
  const yearRange = {
    min: Math.min(...allRecords.map(d => d.year)),
    max: Math.max(...allRecords.map(d => d.year))
  };

  // Find most recent import
  const sortedByDate = [...allRecords].sort((a, b) => 
    (b.eventDate ?? `${b.year}`).localeCompare(a.eventDate ?? `${a.year}`)
  );
  const mostRecentDoc = sortedByDate[0];
  const mostRecentDate = mostRecentDoc?.eventDate?.slice(0, 10) ?? String(mostRecentDoc?.year);

  // Recent labs and imaging for quick access
  const recentLabs = allRecords
    .filter(d => d.type.includes("lab"))
    .sort((a, b) => (b.eventDate ?? `${b.year}`).localeCompare(a.eventDate ?? `${a.year}`))
    .slice(0, 3);
  const recentImaging = allRecords
    .filter(d => d.type.includes("imaging"))
    .sort((a, b) => (b.eventDate ?? `${b.year}`).localeCompare(a.eventDate ?? `${a.year}`))
    .slice(0, 3);

  return (
    <AppShell
      title="Admin Dashboard"
      subtitle={`Managing ${totalDocs} documents • ${yearRange.min}-${yearRange.max}`}
    >
      {/* Actionable status cards */}
      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card title="Verification Status" detail="Data quality">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-3xl font-semibold text-[#1E293B]">{verificationPct}%</p>
              <p className="text-sm text-[#64748B]">verified</p>
            </div>
            <div className="text-right text-sm">
              <p className="text-green-600">{verifiedCount} verified</p>
              <p className="text-amber-600">{unverifiedCount} pending</p>
            </div>
          </div>
        </Card>
        
        <Card title="Needs Review" detail="Action required">
          <Link href="/verification" className="block">
            <p className={`text-3xl font-semibold ${pendingTasks.length > 0 ? 'text-[#DC2626]' : 'text-green-600'}`}>
              {pendingTasks.length}
            </p>
            <p className="text-sm text-[#64748B]">
              {pendingTasks.length > 0 ? 'fields to verify →' : 'all caught up ✓'}
            </p>
          </Link>
        </Card>

        <Card title="Most Recent" detail="Latest document">
          <p className="text-xl font-semibold text-[#1E293B]">{mostRecentDate}</p>
          <p className="truncate text-sm text-[#64748B]">{mostRecentDoc?.fileName ?? 'No records'}</p>
        </Card>

        <Card title="Coverage" detail="Date range">
          <p className="text-xl font-semibold text-[#1E293B]">{yearRange.max - yearRange.min + 1} years</p>
          <p className="text-sm text-[#64748B]">{yearRange.min} – {yearRange.max}</p>
        </Card>
      </section>

      {/* Recent data quick access */}
      <section className="mt-4 grid gap-4 lg:grid-cols-2">
        {/* Recent Labs */}
        <Card title="🧪 Recent Labs" detail="Latest lab documents">
          <div className="space-y-2">
            {recentLabs.map((doc) => (
              <Link
                key={doc.id}
                href={`/records/${doc.id}`}
                className="block rounded-lg border border-[#E2E8F0] bg-white p-3 hover:bg-[#F8FAFC]"
              >
                <p className="truncate font-medium text-[#1D4ED8]">{doc.fileName}</p>
                <p className="text-xs text-[#64748B]">{doc.eventDate?.slice(0, 10) ?? doc.year}</p>
              </Link>
            ))}
            {recentLabs.length === 0 && <p className="text-sm text-[#64748B]">No lab documents</p>}
            <Link href="/labs" className="block text-center text-sm text-[#1D4ED8] hover:underline">
              View all labs →
            </Link>
          </div>
        </Card>

        {/* Recent Imaging */}
        <Card title="📷 Recent Imaging" detail="Latest imaging studies">
          <div className="space-y-2">
            {recentImaging.map((doc) => (
              <Link
                key={doc.id}
                href={`/records/${doc.id}`}
                className="block rounded-lg border border-[#E2E8F0] bg-white p-3 hover:bg-[#F8FAFC]"
              >
                <p className="truncate font-medium text-[#1D4ED8]">{doc.fileName}</p>
                <p className="text-xs text-[#64748B]">{doc.eventDate?.slice(0, 10) ?? doc.year}</p>
              </Link>
            ))}
            {recentImaging.length === 0 && <p className="text-sm text-[#64748B]">No imaging documents</p>}
            <Link href="/imaging" className="block text-center text-sm text-[#1D4ED8] hover:underline">
              View all imaging →
            </Link>
          </div>
        </Card>
      </section>

      {/* Timeline and recent imports */}
      <section className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card title="📅 Recent Clinical Events" detail="Cross-specialty timeline highlights">
          <ul className="space-y-3">
            {snapshot.recentEvents.slice(0, 4).map((item) => (
              <li key={item.label} className="rounded-lg border border-[#CCD3DD] bg-white p-3">
                <p className="font-medium">{item.label}</p>
                <p className="mt-1 text-sm text-muted">{item.value}</p>
              </li>
            ))}
          </ul>
          <Link href="/timeline" className="mt-3 block text-center text-sm text-[#1D4ED8] hover:underline">
            View full timeline →
          </Link>
        </Card>

        <Card title="📄 Latest Imports" detail="Recently added documents">
          <ul className="space-y-2">
            {recentRecords.map((record) => (
              <li key={record.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#CCD3DD] bg-white p-3">
                <div className="min-w-0 flex-1">
                  <Link className="block truncate font-medium text-[#1D4ED8] hover:underline" href={`/records/${record.id}`}>
                    {record.fileName}
                  </Link>
                  <p className="text-xs text-muted capitalize">
                    {record.specialty.replace(/_/g, " ")} • {record.year}
                  </p>
                </div>
                <StatusBadge status={record.verificationStatus} />
              </li>
            ))}
          </ul>
          <Link href="/records" className="mt-3 block text-center text-sm text-[#1D4ED8] hover:underline">
            View all records →
          </Link>
        </Card>
      </section>

      {/* Quick navigation */}
      <section className="mt-4">
        <Card title="Quick Navigation" detail="Jump to any section">
          <div className="flex flex-wrap gap-3">
            <Link href="/records" className="rounded-lg border border-[#1D4ED8] bg-[#EEF2FF] px-4 py-2 text-sm font-medium text-[#1D4ED8] hover:bg-[#E0E7FF]">
              📁 All Records
            </Link>
            <Link href="/labs" className="rounded-lg border border-[#1D4ED8] bg-[#EEF2FF] px-4 py-2 text-sm font-medium text-[#1D4ED8] hover:bg-[#E0E7FF]">
              🧪 Labs
            </Link>
            <Link href="/imaging" className="rounded-lg border border-[#1D4ED8] bg-[#EEF2FF] px-4 py-2 text-sm font-medium text-[#1D4ED8] hover:bg-[#E0E7FF]">
              📷 Imaging
            </Link>
            <Link href="/timeline" className="rounded-lg border border-[#1D4ED8] bg-[#EEF2FF] px-4 py-2 text-sm font-medium text-[#1D4ED8] hover:bg-[#E0E7FF]">
              📅 Timeline
            </Link>
            <Link href="/conditions" className="rounded-lg border border-[#1D4ED8] bg-[#EEF2FF] px-4 py-2 text-sm font-medium text-[#1D4ED8] hover:bg-[#E0E7FF]">
              🩺 Conditions
            </Link>
            <Link href="/specialists" className="rounded-lg border border-[#1D4ED8] bg-[#EEF2FF] px-4 py-2 text-sm font-medium text-[#1D4ED8] hover:bg-[#E0E7FF]">
              👨‍⚕️ Specialists
            </Link>
            <Link href="/verification" className="rounded-lg border border-[#DC2626] bg-[#FEF2F2] px-4 py-2 text-sm font-medium text-[#DC2626] hover:bg-[#FEE2E2]">
              ✓ Verification ({pendingTasks.length})
            </Link>
          </div>
        </Card>
      </section>
    </AppShell>
  );
}
