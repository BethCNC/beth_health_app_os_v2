// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import type { ImportJob } from "@/lib/types/domain";
import { ImportRunner } from "@/components/import/ImportRunner";

describe("ImportRunner", () => {
  it("renders retry and dead-letter summary fields", () => {
    const jobs: ImportJob[] = [
      {
        id: "job_test",
        mode: "sync",
        actor: "test",
        status: "completed",
        createdAt: "2026-01-01T00:00:00.000Z",
        summary: {
          scanned: 10,
          accepted: 9,
          created: 6,
          duplicates: 2,
          rejected: 1,
          failed: 1,
          retryAttempts: 2,
          deadLettered: 1
        },
        items: [],
        errors: [],
        deadLetters: []
      }
    ];

    render(<ImportRunner initialJobs={jobs} defaultPath="/tmp" />);

    expect(screen.getByText("job_test • sync • completed")).toBeInTheDocument();
    expect(screen.getByText(/retries 2, dead-letter 1/i)).toBeInTheDocument();
  });
});
