import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { listTimeline } from "@/lib/repositories/store";

export default function TimelinePage(): React.JSX.Element {
  const data = listTimeline({ from: "2025-01-01T00:00:00.000Z" });

  return (
    <AppShell
      title="Clinical Timeline"
      subtitle="Event-level chronology grouped into episodes to help specialists connect systemic interactions."
    >
      <section className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Card title="Events" detail="Sorted latest-first; each event ties back to source records.">
          <ol className="space-y-3">
            {data.events.map((event) => (
              <li key={event.id} className="rounded-lg border border-line bg-white p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium">{event.title}</p>
                  <StatusBadge status={event.verified ? "verified" : "pending"} />
                </div>
                <p className="mt-1 text-sm text-muted">{event.eventDate.slice(0, 10)} • {event.specialty}</p>
                <p className="mt-2 text-sm">{event.summary}</p>
              </li>
            ))}
          </ol>
        </Card>

        <Card title="Episodes" detail="Grouped by flare/workup windows.">
          <ul className="space-y-3">
            {data.episodes.map((episode) => (
              <li key={episode.id} className="rounded-lg border border-line bg-white p-3">
                <p className="font-medium">{episode.label}</p>
                <p className="mt-1 text-xs text-muted">
                  {episode.startDate.slice(0, 10)} - {episode.endDate ? episode.endDate.slice(0, 10) : "ongoing"}
                </p>
                <p className="mt-2 text-sm text-muted">Conditions: {episode.conditionFocus.join(", ")}</p>
              </li>
            ))}
          </ul>
        </Card>
      </section>
    </AppShell>
  );
}
