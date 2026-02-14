import { Card } from "@/components/ui/Card";
import { accessShareLink, getClinicalSnapshot, listRecords, listTimeline } from "@/lib/repositories/runtime";

interface ClinicianPageProps {
  params: { shareToken: string };
  searchParams: { password?: string };
}

export default async function ClinicianSharedPage({ params, searchParams }: ClinicianPageProps): Promise<React.JSX.Element> {
  const password = searchParams.password;
  if (!password) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <Card
          title="Password required"
          detail="Append ?password=YOUR_PASSWORD to this URL. For production, replace with secure password form and session flow."
        />
      </div>
    );
  }

  const access = await accessShareLink(params.shareToken, password, "provider");
  if (!access.ok) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <Card title="Access denied" detail={`Reason: ${access.reason}.`} />
      </div>
    );
  }

  const snapshot = await getClinicalSnapshot();
  const timeline = (await listTimeline({ from: "2025-01-01T00:00:00.000Z" })).events.slice(0, 8);
  const documents = (await listRecords({})).slice(0, 12);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-4 rounded-2xl border border-line bg-panel p-5 shadow-card">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Clinician Shared View</p>
        <h1 className="mt-1 text-2xl font-semibold">Patient Snapshot + Evidence</h1>
        <p className="mt-2 text-sm text-muted">All insights should be traced back to source records listed below.</p>
      </header>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card title="Active conditions" detail="One-page overview with source linkage.">
          <ul className="space-y-2 text-sm">
            {snapshot.activeConditions.map((item) => (
              <li key={item.label} className="rounded-lg border border-line bg-white p-3">
                <p className="font-medium">{item.label}</p>
                <p className="mt-1 text-muted">{item.value}</p>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Recent critical results" detail="Includes verification state in record library.">
          <ul className="space-y-2 text-sm">
            {snapshot.recentCriticalResults.map((item) => (
              <li key={item.label} className="rounded-lg border border-line bg-white p-3">
                <p className="font-medium">{item.label}</p>
                <p className="mt-1 text-muted">{item.value}</p>
              </li>
            ))}
          </ul>
        </Card>
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card title="Timeline" detail="Cross-specialty event stream.">
          <ul className="space-y-2 text-sm">
            {timeline.map((event) => (
              <li key={event.id} className="rounded-lg border border-line bg-white p-3">
                <p className="font-medium">{event.title}</p>
                <p className="text-xs text-muted">{event.eventDate.slice(0, 10)} • {event.specialty}</p>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Documents" detail="Primary source files for verification and interpretation.">
          <ul className="space-y-2 text-sm">
            {documents.map((doc) => (
              <li key={doc.id} className="rounded-lg border border-line bg-white p-3">
                <p className="font-medium">{doc.fileName}</p>
                <p className="text-xs text-muted">{doc.sourcePath}</p>
              </li>
            ))}
          </ul>
        </Card>
      </section>
    </div>
  );
}
