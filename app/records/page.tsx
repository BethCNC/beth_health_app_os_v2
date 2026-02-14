import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { RecordsFilter } from "@/components/records/RecordsFilter";
import { listRecords } from "@/lib/repositories/runtime";
import Link from "next/link";

interface RecordsPageProps {
  searchParams: Promise<{
    query?: string;
    specialty?: string;
    type?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
  }>;
}

export default async function RecordsPage({ searchParams }: RecordsPageProps): Promise<React.JSX.Element> {
  const params = await searchParams;
  
  // Build filters from URL params
  const filters = {
    query: params.query,
    specialty: params.specialty,
    type: params.type,
    status: params.status,
    dateFrom: params.dateFrom,
    dateTo: params.dateTo
  };

  // Fetch records with filters
  const records = await listRecords(filters);
  const hasFilters = Object.values(filters).some(Boolean);

  // Extract unique values for filter dropdowns
  const allRecords = await listRecords({});
  const specialties = [...new Set(allRecords.map((r) => r.specialty))].sort();
  const types = [...new Set(allRecords.map((r) => r.type))].sort();

  return (
    <AppShell
      title="Records Library"
      subtitle="Searchable document index from Google Drive ingestion. Filter by type, specialty, date, or verification status."
    >
      <div className="mb-4">
        <RecordsFilter
          specialties={specialties}
          types={types}
          initialFilters={filters}
        />
      </div>

      <Card
        title={`${records.length} ${records.length === 1 ? "record" : "records"} found`}
        detail={hasFilters ? "Showing filtered results" : "Showing all records"}
      >
        {records.length === 0 ? (
          <p className="text-sm text-[#5A697B]">No records match your search criteria.</p>
        ) : (
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
                    <td className="px-2 py-2">{record.specialty.replace(/_/g, " ")}</td>
                    <td className="px-2 py-2">{record.type.replace(/_/g, " ")}</td>
                    <td className="px-2 py-2">
                      <StatusBadge status={record.verificationStatus} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </AppShell>
  );
}
