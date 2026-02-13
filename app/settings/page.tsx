import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { ImportRunner } from "@/components/import/ImportRunner";
import { getDataStoreStatus, listImportJobs } from "@/lib/repositories/store";

const ENV_KEYS = [
  "NEXT_PUBLIC_FIREBASE_API_KEY",
  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
  "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
  "NEXT_PUBLIC_FIREBASE_APP_ID",
  "OPENAI_API_KEY"
] as const;

export default function SettingsPage(): React.JSX.Element {
  const states = ENV_KEYS.map((key) => ({ key, configured: Boolean(process.env[key]) }));
  const importJobs = listImportJobs();
  const dataStoreStatus = getDataStoreStatus();

  return (
    <AppShell
      title="Settings"
      subtitle="Security-first configuration status for local development and deployment readiness."
    >
      <Card title="Environment readiness" detail="Do not expose secrets in browser-side variables unless explicitly required.">
        <ul className="space-y-2 text-sm">
          {states.map((item) => (
            <li key={item.key} className="flex items-center justify-between rounded-lg border border-line bg-white p-3">
              <code>{item.key}</code>
              <span className={item.configured ? "font-semibold text-green-700" : "font-semibold text-amber-700"}>
                {item.configured ? "Configured" : "Missing"}
              </span>
            </li>
          ))}
        </ul>
      </Card>

      <Card
        className="mt-4"
        title="Data store status"
        detail="Runtime status for in-memory store plus optional Firestore persistence adapter."
      >
        <ul className="space-y-2 text-sm">
          <li className="flex items-center justify-between rounded-lg border border-[#D6DEE9] bg-white p-3">
            <span>In-memory runtime store</span>
            <span className="font-semibold text-[#1E6A3E]">Enabled</span>
          </li>
          <li className="flex items-center justify-between rounded-lg border border-[#D6DEE9] bg-white p-3">
            <span>Firestore persistence</span>
            <span className={dataStoreStatus.firestorePersistenceEnabled ? "font-semibold text-[#1E6A3E]" : "font-semibold text-[#8A5A11]"}>
              {dataStoreStatus.firestorePersistenceEnabled ? "Enabled" : "Disabled"}
            </span>
          </li>
          {!dataStoreStatus.firestorePersistenceEnabled ? (
            <li className="rounded-lg border border-[#E7CFA7] bg-[#FFF8E8] p-3 text-[#7A5410]">
              Reason: {dataStoreStatus.firestoreReason ?? "unknown"}
            </li>
          ) : null}
        </ul>
      </Card>

      <Card className="mt-4" title="Phase 02 import console" detail="Run backfill/sync jobs and inspect ingestion outcomes.">
        <ImportRunner
          initialJobs={importJobs}
          defaultPath="/Users/bethcartrette/Library/CloudStorage/GoogleDrive-beth@bethcnc.com/My Drive/Health/MEDICAL RECORDS BY YEAR"
        />
      </Card>
    </AppShell>
  );
}
