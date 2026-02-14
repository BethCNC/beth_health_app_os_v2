Source of truth for: Engineering design and implementation details for this phase.
Do not duplicate: Product rationale already captured in PRD.md.

# Phase 02 Implementation Spec — Ingestion and Parsing

## Delivered in this iteration
- Added runtime repository abstraction and contract for app/API consumption.
- Added Firestore query-backed reads for Phase 02 entities with auto-switch + fallback behavior.
- Added transactional Firestore verification updates for approve/reject workflows.
- Added Firestore persistence/read fallback support for `share_links` and `audit_logs`.
- Extended import orchestration with retry/backoff + dead-letter tracking.
- Expanded extraction heuristics for lab/result/procedure/provider patterns.
- Added Vitest test suite covering ingestion, retries/dead-letter behavior, runtime selection, heuristics fixtures, and API smoke scenarios.
- Added `firebase-admin` dependency and improved env validation output.

## Technical design
1. **Runtime repository selection**
   - Evaluate admin runtime via Firestore persistence status.
   - If enabled: use Firestore query-backed reads/actions.
   - If disabled: use existing in-memory store.
   - If Firestore read/action throws unexpectedly: fallback to in-memory read/action for continuity.

2. **Firestore read coverage**
   - Import jobs: list/detail.
   - Records and record detail artifacts: documents, chunks, extracted fields, extracted entities.
   - Verification queue and actions.
   - Timeline events + episode lookup.

3. **Transactional verification updates**
   - Single Firestore transaction updates:
     - `verification_tasks`
     - `documents`
     - `extracted_fields`
     - `extracted_entities`
     - `clinical_events`

4. **Import retry/dead-letter model**
   - Per accepted item:
     - Max attempts: 3.
     - Exponential backoff: base 75ms.
   - Non-retryable error markers: `file_not_found`, `enoent`, `invalid_path_structure`, `disallowed`, `permission denied`, `eacces`.
   - Exhausted/non-retryable failures are persisted in `job.deadLetters[]` and reflected in additive summary counters.

5. **Heuristic hardening**
   - Added regex extraction for lab values (e.g., `TSH 2.40`, `Creatinine 0.91`).
   - Added richer procedure detail extraction from text spans.
   - Improved provider name capture and candidate dedupe behavior.

## Interfaces added/updated
- `ImportJobSummary`
  - `retryAttempts: number`
  - `deadLettered: number`
- `ImportJobItem`
  - `attemptCount?: number`
  - `retryable?: boolean`
  - `lastError?: string`
  - `lastAttemptAt?: string`
- `ImportDeadLetterItem`
- `ImportJob`
  - `deadLetters: ImportDeadLetterItem[]`
- Repository contract: `AppRepository`.

## Data considerations
- All extracted fields/entities remain `pending` until manual verification.
- Duplicate suppression remains fingerprint-based.
- Parse failures remain visible (`parseStatus=failed`) and do not auto-promote trust.
- Additive metadata changes preserve backward compatibility for existing API consumers.

## Risks and mitigations
- Risk: Firestore mode can return sparse results before import writes occur.
  - Mitigation: explicit read-mode visibility in Settings + fallback on read failures.
- Risk: Over-broad retries can mask deterministic failures.
  - Mitigation: deterministic error marker list to skip retries.
- Risk: heuristic precision variability by document format.
  - Mitigation: fixture-driven tests for representative 2025/2026 patterns.
