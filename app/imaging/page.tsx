import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { listRecords } from "@/lib/repositories/store";

export default function ImagingPage(): React.JSX.Element {
  const imaging = listRecords({ type: "imaging" });

  return (
    <AppShell title="Imaging & Scans" subtitle="Imaging records for neurologic, vascular, and related workups.">
      <Card title="Latest imaging documents" detail="Linked to timeline episodes and verification state.">
        <ul className="space-y-2 text-sm">
          {imaging.length === 0 ? <li>No imaging files classified yet.</li> : null}
          {imaging.map((record) => (
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
