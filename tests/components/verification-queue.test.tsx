// @vitest-environment jsdom

import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { VerificationQueue } from "@/components/verification/VerificationQueue";
import type { VerificationTask, DocumentRecord, ExtractedField } from "@/lib/types/domain";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: vi.fn(),
    push: vi.fn()
  })
}));

// Mock fetch
global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ task: { status: "approved" } })
  })
) as unknown as typeof fetch;

interface EnrichedTask extends VerificationTask {
  document?: DocumentRecord;
  pendingFields?: ExtractedField[];
}

const createMockTask = (id: string, priority: "high" | "normal" = "normal"): EnrichedTask => ({
  id,
  documentId: `doc_${id}`,
  fieldIds: ["field_1"],
  status: "pending",
  priority,
  reason: `Test task ${id}`,
  createdAt: "2026-01-01T00:00:00.000Z",
  document: {
    id: `doc_${id}`,
    sourcePath: "/test/path",
    sourceSystem: "google_drive",
    fileName: `Test_Document_${id}.pdf`,
    year: 2026,
    specialty: "primary_care",
    type: "lab_panel",
    tags: ["test"],
    verificationStatus: "pending",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z"
  },
  pendingFields: []
});

describe("VerificationQueue", () => {
  it("renders pending tasks count", () => {
    const tasks: EnrichedTask[] = [
      createMockTask("task_1"),
      createMockTask("task_2"),
      createMockTask("task_3", "high")
    ];

    render(<VerificationQueue tasks={tasks} />);

    expect(screen.getByText("Pending review (3)")).toBeInTheDocument();
  });

  it("shows keyboard shortcuts hint when tasks exist", () => {
    const tasks: EnrichedTask[] = [createMockTask("task_1")];

    render(<VerificationQueue tasks={tasks} />);

    expect(screen.getByText(/Keyboard shortcuts:/)).toBeInTheDocument();
    expect(screen.getByText("↑↓")).toBeInTheDocument();
    expect(screen.getByText("Enter")).toBeInTheDocument();
  });

  it("does not show keyboard shortcuts when no pending tasks", () => {
    const tasks: EnrichedTask[] = [
      { ...createMockTask("task_1"), status: "approved" }
    ];

    render(<VerificationQueue tasks={tasks} />);

    expect(screen.queryByText(/Keyboard shortcuts:/)).not.toBeInTheDocument();
  });

  it("shows bulk approve button for normal priority tasks", () => {
    const tasks: EnrichedTask[] = [
      createMockTask("task_1", "normal"),
      createMockTask("task_2", "normal")
    ];

    render(<VerificationQueue tasks={tasks} />);

    expect(screen.getByText("Approve all normal priority (2)")).toBeInTheDocument();
  });

  it("does not show bulk approve when only high priority tasks exist", () => {
    const tasks: EnrichedTask[] = [
      createMockTask("task_1", "high"),
      createMockTask("task_2", "high")
    ];

    render(<VerificationQueue tasks={tasks} />);

    expect(screen.queryByText(/Approve all normal priority/)).not.toBeInTheDocument();
  });

  it("displays high priority badge", () => {
    const tasks: EnrichedTask[] = [createMockTask("task_1", "high")];

    render(<VerificationQueue tasks={tasks} />);

    expect(screen.getByText("High priority")).toBeInTheDocument();
  });

  it("renders document context when available", () => {
    const tasks: EnrichedTask[] = [createMockTask("task_1")];

    render(<VerificationQueue tasks={tasks} />);

    expect(screen.getByText("Test_Document_task_1.pdf")).toBeInTheDocument();
    expect(screen.getByText(/primary care/)).toBeInTheDocument();
  });

  it("shows resolved tasks section when tasks are resolved", () => {
    const tasks: EnrichedTask[] = [
      { ...createMockTask("task_1"), status: "approved", reviewedAt: "2026-01-02T00:00:00.000Z" }
    ];

    render(<VerificationQueue tasks={tasks} />);

    expect(screen.getByText("Recently resolved (1)")).toBeInTheDocument();
  });

  it("renders approve and reject buttons for each task", () => {
    const tasks: EnrichedTask[] = [createMockTask("task_1")];

    render(<VerificationQueue tasks={tasks} />);

    expect(screen.getByRole("button", { name: "Approve" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reject" })).toBeInTheDocument();
  });

  it("focuses first item by default", () => {
    const tasks: EnrichedTask[] = [
      createMockTask("task_1"),
      createMockTask("task_2")
    ];

    render(<VerificationQueue tasks={tasks} />);

    const firstItem = screen.getAllByRole("option")[0];
    expect(firstItem).toHaveAttribute("aria-selected", "true");
  });

  it("navigates with arrow keys", () => {
    const tasks: EnrichedTask[] = [
      createMockTask("task_1"),
      createMockTask("task_2"),
      createMockTask("task_3")
    ];

    render(<VerificationQueue tasks={tasks} />);

    const listbox = screen.getByRole("listbox");
    
    // Navigate down
    fireEvent.keyDown(listbox, { key: "ArrowDown" });
    
    const items = screen.getAllByRole("option");
    expect(items[1]).toHaveAttribute("aria-selected", "true");
    expect(items[0]).toHaveAttribute("aria-selected", "false");
  });

  it("shows empty state when no pending tasks", () => {
    const tasks: EnrichedTask[] = [];

    render(<VerificationQueue tasks={tasks} />);

    expect(screen.getByText("No tasks pending verification.")).toBeInTheDocument();
  });
});
