import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { listRecords } from "@/lib/repositories/store";

export default function LabsPage(): React.JSX.Element {
  const labs = listRecords({ type: "lab" });

  return (
    <AppShell title="Labs" subtitle="Lab-focused index with verification status.">
      <Card title="Latest lab documents" detail="Pulled from normalized record type heuristics.">
        <ul className="space-y-2 text-sm">
          {labs.length === 0 ? <li>No lab files classified yet.</li> : null}
          {labs.map((record) => (
            <li key={record.id} className="rounded-lg border border-[#D1D7E0] bg-white p-3">
              <p className="font-semibold">{record.fileName}</p>
              <p className="text-xs text-[#556273]">{record.specialty} • {record.year}</p>
            </li>
          ))}
        </ul>
      </Card>
    </AppShell>
  );
}
