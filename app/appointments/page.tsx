import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { listTimeline } from "@/lib/repositories/store";

export default function AppointmentsPage(): React.JSX.Element {
  const events = listTimeline({ from: "2025-01-01T00:00:00.000Z" }).events.filter((event) => event.type === "appointment");

  return (
    <AppShell
      title="Appointments"
      subtitle="Upcoming appointments can be merged later from calendar feeds; this view currently surfaces appointment events from records."
    >
      <Card title="Known appointments" detail="Derived from imported appointment notes and summaries.">
        {events.length === 0 ? (
          <p className="text-sm text-muted">No structured appointments available yet.</p>
        ) : (
          <ul className="space-y-3">
            {events.map((event) => (
              <li key={event.id} className="rounded-lg border border-line bg-white p-3">
                <p className="font-medium">{event.title}</p>
                <p className="mt-1 text-xs text-muted">{event.eventDate.slice(0, 10)} • {event.specialty}</p>
                <p className="mt-2 text-sm">{event.summary}</p>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </AppShell>
  );
}
