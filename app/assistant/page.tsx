import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";

export default function AssistantPage(): React.JSX.Element {
  return (
    <AppShell title="AI Assistant" subtitle="Evidence-only assistant with citations and confidence scoring.">
      <Card
        title="Query endpoint"
        detail="Use POST /api/ai/query to ask evidence-grounded questions. Requests for diagnosis/treatment are refused by policy."
      >
        <pre className="overflow-x-auto rounded-lg bg-[#0B1220] p-3 text-xs text-slate-100">{`{
  "question": "What changed across neurology and vascular records in 2025-2026?",
  "actor": "beth"
}`}</pre>
      </Card>
    </AppShell>
  );
}
