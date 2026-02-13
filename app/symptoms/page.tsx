import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";

export default function SymptomsPage(): React.JSX.Element {
  return (
    <AppShell title="Symptoms" subtitle="Track symptom patterns tied to events and investigations.">
      <Card
        title="Symptom timeline (next)"
        detail="Phase 04+ will connect symptom windows to imaging/lab episodes and appointments."
      />
    </AppShell>
  );
}
