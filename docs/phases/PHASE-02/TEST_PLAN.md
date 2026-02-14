Source of truth for: Automated and manual test coverage for this phase.
Do not duplicate: Product-level goals from PRD.md.

# Phase 02 Test Plan — Ingestion and Parsing

## Automated tests run
- `npm run test`
- `npm run typecheck`
- `npm run build`

## Unit/integration scenarios
1. Duplicate suppression increments `duplicates` and does not re-index known fingerprints.
2. Parse failure path keeps records visible with `parseStatus=failed`.
3. Transient indexing failures retry and eventually succeed with retry counters updated.
4. Non-retryable failures skip retries and land in dead-letter metadata.
5. Runtime repository falls back to in-memory when Firestore is unavailable or read errors occur.
6. Heuristics fixtures validate extraction of:
   - lab markers
   - lab values
   - procedure markers/details
   - provider mentions

## API smoke scenarios
1. `POST /api/import/backfill` returns additive retry/dead-letter summary fields.
2. `GET /api/import/jobs` exposes persisted retry/dead-letter metadata.
3. `POST /api/verification/:entityId/approve` transitions pending task to approved.

## Manual tests
1. Open `/settings` and confirm read mode + persistence status messaging.
2. Run `backfill` for `2025,2026` from import console.
3. Validate summary counts include retries/dead-letter metrics.
4. Open `/records/:id` and verify parse status, extracted fields/entities, and chunks.
5. Approve/reject a verification task and confirm queue + status transitions.

## Pass criteria
- Import jobs show traceable status/counts including retry/dead-letter metrics.
- Runtime repository behaves correctly in both Firestore-enabled and fallback modes.
- Verification transitions remain consistent across repository modes.
- No type/build regressions.
