"use client";

import { FormEvent, useState } from "react";
import type { ImportJob } from "@/lib/types/domain";

export function ImportRunner({
  initialJobs,
  defaultPath
}: {
  initialJobs: ImportJob[];
  defaultPath: string;
}): React.JSX.Element {
  const [jobs, setJobs] = useState<ImportJob[]>(initialJobs);
  const [mode, setMode] = useState<"backfill" | "sync">("backfill");
  const [rootPath, setRootPath] = useState(defaultPath);
  const [years, setYears] = useState("2025,2026");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const parsedYears = years
        .split(",")
        .map((value) => Number(value.trim()))
        .filter((value) => Number.isFinite(value) && value > 1990);

      const response = await fetch(`/api/import/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rootPath,
          years: parsedYears,
          initiatedBy: "beth"
        })
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error ?? "Import failed");
      }

      const jobsResponse = await fetch("/api/import/jobs");
      if (jobsResponse.ok) {
        const payload = (await jobsResponse.json()) as { jobs?: ImportJob[] };
        setJobs(payload.jobs ?? []);
      }
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "Unknown error";
      setError(message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-4">
      <form onSubmit={onSubmit} className="rounded-lg border border-[#D1D7E0] bg-white p-4">
        <div className="grid gap-3 md:grid-cols-2">
          <label className="text-sm font-semibold">
            Mode
            <select
              className="mt-1 w-full rounded-lg border border-[#C7D0DE] bg-white px-3 py-2"
              value={mode}
              onChange={(event) => setMode(event.target.value as "backfill" | "sync")}
            >
              <option value="backfill">backfill</option>
              <option value="sync">sync</option>
            </select>
          </label>
          <label className="text-sm font-semibold">
            Years
            <input
              className="mt-1 w-full rounded-lg border border-[#C7D0DE] bg-white px-3 py-2"
              value={years}
              onChange={(event) => setYears(event.target.value)}
              placeholder="2025,2026"
            />
          </label>
          <label className="text-sm font-semibold md:col-span-2">
            Root path
            <input
              className="mt-1 w-full rounded-lg border border-[#C7D0DE] bg-white px-3 py-2"
              value={rootPath}
              onChange={(event) => setRootPath(event.target.value)}
            />
          </label>
        </div>

        <button
          type="submit"
          disabled={busy}
          className="mt-3 rounded-lg bg-[#08274B] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {busy ? "Running import..." : "Run import job"}
        </button>

        {error ? <p className="mt-3 rounded-lg border border-[#F2B4B4] bg-[#FEF2F2] px-3 py-2 text-sm text-[#991B1B]">{error}</p> : null}
      </form>

      <article className="rounded-lg border border-[#D1D7E0] bg-white p-4">
        <h3 className="text-lg font-semibold">Recent import jobs</h3>
        <ul className="mt-3 space-y-2 text-sm">
          {jobs.length === 0 ? <li className="text-[#5A697B]">No import jobs yet.</li> : null}
          {jobs.slice(0, 10).map((job) => (
            <li key={job.id} className="rounded-lg border border-[#E2E8F0] p-3">
              <p className="font-semibold">
                {job.id} • {job.mode} • {job.status}
              </p>
              <p className="text-[#5A697B]">
                scanned {job.summary.scanned}, created {job.summary.created}, duplicates {job.summary.duplicates}, failed {job.summary.failed}
              </p>
            </li>
          ))}
        </ul>
      </article>
    </section>
  );
}
