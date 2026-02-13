import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { listRecords } from "@/lib/repositories/store";
import Link from "next/link";

export default function RecordsPage(): React.JSX.Element {
  const records = listRecords({}).filter((record) => record.year >= 2025);

  return (
    <AppShell
      title="Records Library"
      subtitle="Canonical document index from Google Drive ingestion. 2025 and 2026 are prioritized for current workflows."
    >
      <Card title="Document list" detail="Filter and search are exposed through /api/records query params for UI wiring.">
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-[#CCD3DD] text-left">
                <th className="px-2 py-2">Date</th>
                <th className="px-2 py-2">File</th>
                <th className="px-2 py-2">Specialty</th>
                <th className="px-2 py-2">Type</th>
                <th className="px-2 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => (
                <tr key={record.id} id={`doc-${record.id}`} className="border-b border-[#E3E8EF] align-top">
                  <td className="px-2 py-2 text-muted">{record.eventDate ? record.eventDate.slice(0, 10) : "Unknown"}</td>
                  <td className="px-2 py-2">
                    <Link href={`/records/${record.id}`} className="font-medium text-[#1D4ED8] hover:underline">
                      {record.fileName}
                    </Link>
                    <p className="text-xs text-muted">{record.sourcePath}</p>
                  </td>
                  <td className="px-2 py-2">{record.specialty}</td>
                  <td className="px-2 py-2">{record.type}</td>
                  <td className="px-2 py-2">
                    <StatusBadge status={record.verificationStatus} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </AppShell>
  );
}
