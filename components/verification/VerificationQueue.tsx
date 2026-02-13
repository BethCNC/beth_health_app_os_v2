"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { VerificationTask } from "@/lib/types/domain";

export function VerificationQueue({ tasks }: { tasks: VerificationTask[] }): React.JSX.Element {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runAction(taskId: string, action: "approve" | "reject"): Promise<void> {
    try {
      setBusyId(taskId);
      setError(null);
      const response = await fetch(`/api/verification/${taskId}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewer: "beth" })
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error ?? `Failed to ${action} task`);
      }

      router.refresh();
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "Unknown error";
      setError(message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      {error ? <p className="mb-3 rounded-lg border border-[#F2B4B4] bg-[#FEF2F2] px-3 py-2 text-sm text-[#9F1D1D]">{error}</p> : null}
      <ul className="space-y-3">
        {tasks.map((task) => {
          const isPending = task.status === "pending";
          const isBusy = busyId === task.id;

          return (
            <li key={task.id} className="rounded-lg border border-[#D1D7E0] bg-white p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium">Task {task.id}</p>
                <StatusBadge status={task.status} />
              </div>
              <p className="mt-1 text-sm text-[#5D6B7D]">Doc: {task.documentId}</p>
              <p className="mt-2 text-sm">{task.reason}</p>

              {isPending ? (
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => runAction(task.id, "approve")}
                    className="rounded-lg border border-[#93D0B1] bg-[#EAF8F0] px-3 py-1.5 text-sm font-semibold text-[#1C6A3C] disabled:opacity-60"
                  >
                    {isBusy ? "Saving..." : "Approve"}
                  </button>
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => runAction(task.id, "reject")}
                    className="rounded-lg border border-[#E7B1B1] bg-[#FDF1F1] px-3 py-1.5 text-sm font-semibold text-[#9F1D1D] disabled:opacity-60"
                  >
                    Reject
                  </button>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </>
  );
}
