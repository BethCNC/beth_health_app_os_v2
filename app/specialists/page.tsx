import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";

export default function SpecialistsPage(): React.JSX.Element {
  return (
    <AppShell title="Specialists" subtitle="Provider-specific history and evidence trail across networks.">
      <Card
        title="Specialist index (next)"
        detail="This view will group records, events, and follow-ups by specialty and clinician for fast handoff."
      />
    </AppShell>
  );
}
