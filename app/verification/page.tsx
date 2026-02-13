import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { VerificationQueue } from "@/components/verification/VerificationQueue";
import { listVerificationTasks } from "@/lib/repositories/store";

export default function VerificationPage(): React.JSX.Element {
  const tasks = listVerificationTasks();

  return (
    <AppShell
      title="Verification Inbox"
      subtitle="Every extracted field remains untrusted until reviewed. Approve or reject items directly here."
    >
      <Card title="Manual verification queue" detail="This enforces evidence quality before timeline/snapshot/AI trust.">
        <VerificationQueue tasks={tasks} />
      </Card>
    </AppShell>
  );
}
