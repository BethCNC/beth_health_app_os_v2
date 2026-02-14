import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { VerificationQueue } from "@/components/verification/VerificationQueue";
import {
  getRecordById,
  listExtractedFieldsByDocumentId,
  listVerificationTasks
} from "@/lib/repositories/runtime";
import type { DocumentRecord, ExtractedField, VerificationTask } from "@/lib/types/domain";

interface EnrichedTask extends VerificationTask {
  document?: DocumentRecord;
  pendingFields?: ExtractedField[];
}

export default async function VerificationPage(): Promise<React.JSX.Element> {
  const tasks = await listVerificationTasks();

  // Enrich tasks with document context and pending fields
  const enrichedTasks: EnrichedTask[] = await Promise.all(
    tasks.map(async (task) => {
      const document = await getRecordById(task.documentId);
      const allFields = await listExtractedFieldsByDocumentId(task.documentId);
      const pendingFields = allFields.filter((f) => f.verificationStatus === "pending");

      return {
        ...task,
        document: document ?? undefined,
        pendingFields
      };
    })
  );

  const pendingCount = enrichedTasks.filter((t) => t.status === "pending").length;

  return (
    <AppShell
      title="Verification Inbox"
      subtitle={`${pendingCount} ${pendingCount === 1 ? "task" : "tasks"} pending review. Each extracted field remains untrusted until verified.`}
    >
      <Card
        title="Manual verification queue"
        detail="Review extracted data to enforce evidence quality before timeline/snapshot/AI trust."
      >
        <VerificationQueue tasks={enrichedTasks} />
      </Card>
    </AppShell>
  );
}
