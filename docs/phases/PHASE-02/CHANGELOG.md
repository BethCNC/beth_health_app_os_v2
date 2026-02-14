Source of truth for: Completed work and notable changes within this phase.
Do not duplicate: Open tasks from TASK_BOARD.md.

# Phase 02 Changelog — Ingestion and Parsing

## Added
- Runtime repository contract and selector (`in-memory` vs `Firestore`) with automatic fallback on Firestore read failures.
- Firestore query-backed read paths for import jobs, records, chunks, extracted fields/entities, verification queue, and timeline.
- Firestore transactional verification approve/reject updates to keep task/document/field/entity/event state consistent.
- Import retry/dead-letter metadata:
  - `ImportJobSummary.retryAttempts`
  - `ImportJobSummary.deadLettered`
  - `ImportJob.deadLetters[]`
  - `ImportJobItem` attempt/error metadata
- Inline retry/backoff handling for transient indexing failures with capped attempts.
- Fixture-driven extraction heuristic tests for lab markers/values, procedures, and provider mentions.
- Vitest-based test harness with API smoke tests and repository/service unit coverage.
- `firebase-admin` dependency and env check reporting for admin package readiness.

## Changed
- App routes and API routes now read via runtime repository abstraction instead of direct in-memory store reads.
- Settings page now surfaces runtime read mode (`Firestore` vs `In-memory`).
- Import console now displays retry and dead-letter counts in job summaries.
- Heuristic extraction rules expanded for 2025/2026 lab/result/procedure patterns.

## Fixed
- Closed remaining Phase 02 hardening gaps tracked in `TASK_BOARD.md`.

## Notes
- Firestore read paths activate only when admin runtime is enabled; otherwise repository uses in-memory fallback.
- Share-link and audit artifacts are persisted to Firestore when admin runtime is enabled.
