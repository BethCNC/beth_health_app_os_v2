Source of truth for: Automated and manual test coverage for this phase.
Do not duplicate: Product-level goals from PRD.md.

# Phase 02 Test Plan — Ingestion and Parsing

## Automated tests run
- `npm run typecheck`
- `npm run build`

## API scenarios
1. Backfill import using `rootPath + years` returns `jobId` and summary.
2. Sync import with duplicate files increments `duplicates` not `created`.
3. Rejected non-PDF files appear as `rejected` import items.
4. Job list endpoint returns recent jobs with status and per-item outcomes.

## Manual tests
1. Open `/settings` and run a backfill for 2025/2026.
2. Confirm job row appears in import console.
3. Open `/records/:id` for newly imported doc.
4. Verify parse status, extracted fields/entities, and text chunks are visible.
5. Approve/reject verification task and verify status transitions.

## Pass criteria
- Import jobs complete with traceable status and counts.
- New imports generate verification tasks and indexed chunks.
- No type/build regressions.
