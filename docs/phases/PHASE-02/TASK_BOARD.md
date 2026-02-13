Source of truth for: Execution tasks and status tracking for this phase.
Do not duplicate: Deep technical rationale (see IMPLEMENTATION_SPEC.md).

# Phase 02 Task Board — Ingestion and Parsing

## Todo
- [ ] Replace read paths from in-memory store to Firestore query-backed repositories.
- [ ] Add retries/backoff and dead-letter handling for failed items.
- [ ] Add ingestion unit/integration tests for duplicate + parse-failure paths.

## In Progress
- [ ] Hardening extraction heuristics for lab/result parsing quality.
- [ ] Firestore persistence activation in local env (`firebase-admin` install + service account vars).

## Done
- [x] Confirm phase scope and acceptance tests.
- [x] Implement backend/API tasks.
- [x] Implement frontend UX tasks (import console + indexed record visibility).
- [x] Perform build validation.
- [x] Update CHANGELOG.md with completed work.
- [x] Add optional Firestore persistence adapter writes for import and verification artifacts.
