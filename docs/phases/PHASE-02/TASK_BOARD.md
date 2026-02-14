Source of truth for: Execution tasks and status tracking for this phase.
Do not duplicate: Deep technical rationale (see IMPLEMENTATION_SPEC.md).

# Phase 02 Task Board — Ingestion and Parsing

## Todo
- [ ] None

## In Progress
- [ ] None

## Done
- [x] Confirm phase scope and acceptance tests.
- [x] Implement backend/API tasks.
- [x] Implement frontend UX tasks (import console + indexed record visibility).
- [x] Perform build validation.
- [x] Update CHANGELOG.md with completed work.
- [x] Add optional Firestore persistence adapter writes for import and verification artifacts.
- [x] Replace read paths from in-memory store to Firestore query-backed runtime repository with automatic fallback.
- [x] Add retries/backoff and dead-letter handling for failed items.
- [x] Harden extraction heuristics for lab/result and procedure parsing quality.
- [x] Add ingestion unit/integration tests for duplicate + parse-failure + retry/dead-letter paths.
- [x] Activate Firestore persistence support in local runtime (`firebase-admin` dependency + status checks and env validation).
