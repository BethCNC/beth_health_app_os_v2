import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";

export default function ConditionsPage(): React.JSX.Element {
  return (
    <AppShell title="Conditions" subtitle="Cross-specialty condition map with verified evidence references.">
      <Card
        title="Condition registry (next)"
        detail="This phase will merge verified diagnoses, symptom clusters, and related events into a condition-centric view."
      />
    </AppShell>
  );
}
