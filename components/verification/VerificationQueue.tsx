"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { DocumentRecord, ExtractedField, VerificationTask } from "@/lib/types/domain";

interface EnrichedTask extends VerificationTask {
  document?: DocumentRecord;
  pendingFields?: ExtractedField[];
}

export function VerificationQueue({ tasks }: { tasks: EnrichedTask[] }): React.JSX.Element {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reviewerNotes, setReviewerNotes] = useState<Record<string, string>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);
  const itemRefs = useRef<(HTMLLIElement | null)[]>([]);

  const pendingTasks = tasks.filter((t) => t.status === "pending");
  const resolvedTasks = tasks.filter((t) => t.status !== "pending");
  const lowRiskTasks = pendingTasks.filter((t) => t.priority === "normal");

  async function runAction(taskId: string, action: "approve" | "reject"): Promise<void> {
    try {
      setBusyId(taskId);
      setError(null);
      const response = await fetch(`/api/verification/${taskId}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewer: "beth", note: reviewerNotes[taskId] || undefined })
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

  async function bulkApproveNormalPriority(): Promise<void> {
    if (lowRiskTasks.length === 0) return;

    try {
      setBulkBusy(true);
      setError(null);

      for (const task of lowRiskTasks) {
        const response = await fetch(`/api/verification/${task.id}/approve`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reviewer: "beth", note: "Bulk approved (normal priority)" })
        });

        if (!response.ok) {
          const payload = (await response.json().catch(() => ({}))) as { error?: string };
          throw new Error(payload.error ?? `Failed to approve task ${task.id}`);
        }
      }

      router.refresh();
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "Unknown error";
      setError(message);
    } finally {
      setBulkBusy(false);
    }
  }

  // Keyboard navigation handler
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (pendingTasks.length === 0) return;

      switch (event.key) {
        case "ArrowDown":
        case "j":
          event.preventDefault();
          setFocusedIndex((prev) => Math.min(prev + 1, pendingTasks.length - 1));
          break;
        case "ArrowUp":
        case "k":
          event.preventDefault();
          setFocusedIndex((prev) => Math.max(prev - 1, 0));
          break;
        case "Enter":
          event.preventDefault();
          if (pendingTasks[focusedIndex] && !busyId) {
            runAction(pendingTasks[focusedIndex].id, "approve");
          }
          break;
        case "Backspace":
        case "Delete":
          event.preventDefault();
          if (pendingTasks[focusedIndex] && !busyId) {
            runAction(pendingTasks[focusedIndex].id, "reject");
          }
          break;
        case "e":
          event.preventDefault();
          if (pendingTasks[focusedIndex]) {
            const taskId = pendingTasks[focusedIndex].id;
            setExpandedId((prev) => (prev === taskId ? null : taskId));
          }
          break;
        case "Home":
          event.preventDefault();
          setFocusedIndex(0);
          break;
        case "End":
          event.preventDefault();
          setFocusedIndex(pendingTasks.length - 1);
          break;
      }
    },
    [pendingTasks, focusedIndex, busyId]
  );

  // Focus management
  useEffect(() => {
    if (itemRefs.current[focusedIndex]) {
      itemRefs.current[focusedIndex]?.focus();
    }
  }, [focusedIndex]);

  // Reset focus when tasks change
  useEffect(() => {
    if (focusedIndex >= pendingTasks.length) {
      setFocusedIndex(Math.max(0, pendingTasks.length - 1));
    }
  }, [pendingTasks.length, focusedIndex]);

  return (
    <div className="space-y-6">
      {error && (
        <p className="rounded-lg border border-[#F2B4B4] bg-[#FEF2F2] px-3 py-2 text-sm text-[#9F1D1D]">
          {error}
        </p>
      )}

      {/* Keyboard shortcuts hint */}
      {pendingTasks.length > 0 && (
        <div className="rounded-lg border border-[#E0E7FF] bg-[#EEF2FF] px-3 py-2 text-xs text-[#4338CA]">
          <span className="font-semibold">Keyboard shortcuts:</span>{" "}
          <kbd className="rounded bg-white px-1.5 py-0.5 font-mono text-[10px]">↑↓</kbd> navigate,{" "}
          <kbd className="rounded bg-white px-1.5 py-0.5 font-mono text-[10px]">Enter</kbd> approve,{" "}
          <kbd className="rounded bg-white px-1.5 py-0.5 font-mono text-[10px]">Del</kbd> reject,{" "}
          <kbd className="rounded bg-white px-1.5 py-0.5 font-mono text-[10px]">e</kbd> expand
        </div>
      )}

      {/* Pending tasks section */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[#374151]">
            Pending review ({pendingTasks.length})
          </h3>

          {/* Bulk actions */}
          {lowRiskTasks.length > 0 && (
            <button
              type="button"
              disabled={bulkBusy || Boolean(busyId)}
              onClick={bulkApproveNormalPriority}
              className="rounded-lg border border-[#93D0B1] bg-[#EAF8F0] px-3 py-1.5 text-xs font-semibold text-[#1C6A3C] hover:bg-[#D8F3E2] disabled:opacity-60"
            >
              {bulkBusy ? "Processing..." : `Approve all normal priority (${lowRiskTasks.length})`}
            </button>
          )}
        </div>

        {pendingTasks.length === 0 ? (
          <p className="text-sm text-[#6B7280]">No tasks pending verification.</p>
        ) : (
          <ul
            ref={listRef}
            className="space-y-3"
            role="listbox"
            aria-label="Verification tasks"
            onKeyDown={handleKeyDown}
          >
            {pendingTasks.map((task, index) => {
              const isBusy = busyId === task.id;
              const isExpanded = expandedId === task.id;
              const isFocused = focusedIndex === index;

              return (
                <li
                  key={task.id}
                  ref={(el) => { itemRefs.current[index] = el; }}
                  tabIndex={isFocused ? 0 : -1}
                  role="option"
                  aria-selected={isFocused}
                  onClick={() => setFocusedIndex(index)}
                  className={`rounded-lg border p-4 outline-none transition-shadow ${
                    task.priority === "high"
                      ? "border-[#FCD34D] bg-[#FFFBEB]"
                      : "border-[#D1D7E0] bg-white"
                  } ${isFocused ? "ring-2 ring-[#3B82F6] ring-offset-1" : ""}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {task.priority === "high" && (
                          <span className="rounded-full bg-[#FEF3C7] px-2 py-0.5 text-xs font-semibold text-[#92400E]">
                            High priority
                          </span>
                        )}
                        <StatusBadge status={task.status} />
                      </div>

                      <p className="mt-2 text-sm font-medium text-[#1F2937]">{task.reason}</p>

                      {/* Document context */}
                      {task.document ? (
                        <div className="mt-2 rounded-lg bg-[#F8FAFC] p-3 text-sm">
                          <div className="flex items-center justify-between">
                            <Link
                              href={`/records/${task.documentId}`}
                              className="font-medium text-[#1D4ED8] hover:underline"
                            >
                              {task.document.fileName}
                            </Link>
                            <span className="text-xs text-[#6B7280]">
                              {task.document.eventDate?.slice(0, 10) ?? "Unknown date"}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-[#6B7280]">
                            {task.document.specialty.replace(/_/g, " ")} &bull;{" "}
                            {task.document.type.replace(/_/g, " ")}
                          </p>
                          {task.document.textPreview && (
                            <p className="mt-2 text-xs text-[#4B5563] line-clamp-2">
                              {task.document.textPreview}
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="mt-2 text-sm text-[#6B7280]">
                          Document: <code className="text-xs">{task.documentId}</code>
                        </p>
                      )}

                      {/* Show pending fields if available */}
                      {task.pendingFields && task.pendingFields.length > 0 && (
                        <div className="mt-3">
                          <button
                            type="button"
                            onClick={() => setExpandedId(isExpanded ? null : task.id)}
                            className="text-xs font-medium text-[#3B82F6] hover:underline"
                          >
                            {isExpanded ? "Hide" : "Show"} {task.pendingFields.length} extracted fields
                          </button>
                          {isExpanded && (
                            <ul className="mt-2 space-y-2">
                              {task.pendingFields.map((field) => (
                                <li
                                  key={field.id}
                                  className="rounded-lg border border-[#E5E7EB] bg-white p-2 text-xs"
                                >
                                  <span className="font-semibold">{field.key}:</span>{" "}
                                  <span className="text-[#374151]">{field.value}</span>
                                  <span className="ml-2 text-[#9CA3AF]">
                                    (confidence: {(field.confidence * 100).toFixed(0)}%)
                                  </span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )}

                      {/* Reviewer note input */}
                      <div className="mt-3">
                        <textarea
                          placeholder="Add an optional note..."
                          value={reviewerNotes[task.id] || ""}
                          onChange={(e) =>
                            setReviewerNotes((prev) => ({ ...prev, [task.id]: e.target.value }))
                          }
                          className="w-full rounded-lg border border-[#D1D7E0] bg-white px-3 py-2 text-sm focus:border-[#3B82F6] focus:outline-none focus:ring-1 focus:ring-[#3B82F6]"
                          rows={2}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="mt-3 flex gap-2 border-t border-[#E5E7EB] pt-3">
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => runAction(task.id, "approve")}
                      className="rounded-lg border border-[#93D0B1] bg-[#EAF8F0] px-4 py-2 text-sm font-semibold text-[#1C6A3C] hover:bg-[#D8F3E2] disabled:opacity-60"
                    >
                      {isBusy ? "Saving..." : "Approve"}
                    </button>
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => runAction(task.id, "reject")}
                      className="rounded-lg border border-[#E7B1B1] bg-[#FDF1F1] px-4 py-2 text-sm font-semibold text-[#9F1D1D] hover:bg-[#FDE4E4] disabled:opacity-60"
                    >
                      Reject
                    </button>
                    <Link
                      href={`/records/${task.documentId}`}
                      className="ml-auto rounded-lg border border-[#D1D7E0] bg-white px-4 py-2 text-sm font-semibold text-[#374151] hover:bg-[#F8FAFC]"
                    >
                      View record
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Resolved tasks section */}
      {resolvedTasks.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold text-[#374151]">
            Recently resolved ({resolvedTasks.length})
          </h3>
          <ul className="space-y-2">
            {resolvedTasks.slice(0, 5).map((task) => (
              <li
                key={task.id}
                className="flex items-center justify-between rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-3 text-sm"
              >
                <div>
                  <span className="text-[#6B7280]">{task.reason}</span>
                  {task.reviewedAt && (
                    <span className="ml-2 text-xs text-[#9CA3AF]">
                      {new Date(task.reviewedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <StatusBadge status={task.status} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
