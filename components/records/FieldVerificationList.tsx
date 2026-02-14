"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { ExtractedField } from "@/lib/types/domain";

interface FieldVerificationListProps {
  fields: ExtractedField[];
  documentId: string;
}

export function FieldVerificationList({ fields, documentId }: FieldVerificationListProps): React.JSX.Element {
  const router = useRouter();
  const [busyFieldId, setBusyFieldId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function verifyField(fieldId: string, action: "approve" | "reject"): Promise<void> {
    try {
      setBusyFieldId(fieldId);
      setError(null);

      const response = await fetch(`/api/verification/field/${fieldId}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewer: "beth" })
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error ?? `Failed to ${action} field`);
      }

      router.refresh();
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "Unknown error";
      setError(message);
    } finally {
      setBusyFieldId(null);
    }
  }

  const pendingFields = fields.filter((f) => f.verificationStatus === "pending");
  const verifiedFields = fields.filter((f) => f.verificationStatus === "verified");
  const rejectedFields = fields.filter((f) => f.verificationStatus === "rejected");

  return (
    <div className="space-y-4">
      {error && (
        <p className="rounded-lg border border-[#F2B4B4] bg-[#FEF2F2] px-3 py-2 text-sm text-[#9F1D1D]">
          {error}
        </p>
      )}

      {/* Summary counts */}
      <div className="flex gap-4 text-sm">
        <span className="text-[#6B7280]">
          <span className="font-semibold text-[#F59E0B]">{pendingFields.length}</span> pending
        </span>
        <span className="text-[#6B7280]">
          <span className="font-semibold text-[#10B981]">{verifiedFields.length}</span> verified
        </span>
        {rejectedFields.length > 0 && (
          <span className="text-[#6B7280]">
            <span className="font-semibold text-[#EF4444]">{rejectedFields.length}</span> rejected
          </span>
        )}
      </div>

      {/* Pending fields with actions */}
      {pendingFields.length > 0 && (
        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#6B7280]">
            Pending verification
          </h4>
          <ul className="space-y-2">
            {pendingFields.map((field) => {
              const isBusy = busyFieldId === field.id;
              return (
                <li
                  key={field.id}
                  className="rounded-lg border border-[#FCD34D] bg-[#FFFBEB] p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <p className="font-semibold text-[#1F2937]">{field.key}</p>
                      <p className="text-sm text-[#4B5563]">{field.value}</p>
                      <div className="mt-1 flex items-center gap-2 text-xs text-[#6B7280]">
                        <span>Confidence: {(field.confidence * 100).toFixed(0)}%</span>
                        <StatusBadge status={field.verificationStatus} />
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => verifyField(field.id, "approve")}
                        className="rounded border border-[#93D0B1] bg-[#EAF8F0] px-2 py-1 text-xs font-semibold text-[#1C6A3C] hover:bg-[#D8F3E2] disabled:opacity-60"
                        title="Approve"
                      >
                        {isBusy ? "..." : "✓"}
                      </button>
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => verifyField(field.id, "reject")}
                        className="rounded border border-[#E7B1B1] bg-[#FDF1F1] px-2 py-1 text-xs font-semibold text-[#9F1D1D] hover:bg-[#FDE4E4] disabled:opacity-60"
                        title="Reject"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Verified fields */}
      {verifiedFields.length > 0 && (
        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#6B7280]">
            Verified
          </h4>
          <ul className="space-y-2">
            {verifiedFields.map((field) => (
              <li
                key={field.id}
                className="rounded-lg border border-[#A9DFC2] bg-[#E7F9EE] p-3"
              >
                <p className="font-semibold text-[#1F2937]">{field.key}</p>
                <p className="text-sm text-[#4B5563]">{field.value}</p>
                <div className="mt-1 flex items-center gap-2 text-xs text-[#6B7280]">
                  <span>Confidence: {(field.confidence * 100).toFixed(0)}%</span>
                  <StatusBadge status={field.verificationStatus} />
                  {field.reviewedAt && (
                    <span>Reviewed: {new Date(field.reviewedAt).toLocaleDateString()}</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Rejected fields */}
      {rejectedFields.length > 0 && (
        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#6B7280]">
            Rejected
          </h4>
          <ul className="space-y-2">
            {rejectedFields.map((field) => (
              <li
                key={field.id}
                className="rounded-lg border border-[#F4B1B1] bg-[#FDF1F1] p-3 opacity-75"
              >
                <p className="font-semibold text-[#1F2937] line-through">{field.key}</p>
                <p className="text-sm text-[#6B7280]">{field.value}</p>
                {field.reviewerNote && (
                  <p className="mt-1 text-xs text-[#9B2323]">Note: {field.reviewerNote}</p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {fields.length === 0 && (
        <p className="text-sm text-[#6B7280]">No extracted fields yet.</p>
      )}
    </div>
  );
}
