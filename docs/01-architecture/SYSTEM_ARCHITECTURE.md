Source of truth for: Runtime components, service boundaries, and data flow.
Do not duplicate: Field-level Firestore schema specifics (see DATA_MODEL.md).

# System Architecture

## Stack
- Next.js app router (UI + API routes)
- TypeScript
- Tailwind CSS
- Firebase (Firestore + Storage)

## Core Components
- Ingestion API (`/api/import/backfill`, `/api/import/sync`)
- Records API (`/api/records`)
- Timeline API (`/api/timeline`)
- Verification API (`/api/verification/:entityId/{approve|reject}`)
- Sharing API (`/api/share-links`, `/api/share-links/:token`)
- AI API (`/api/ai/query`)

## Data Flow
1. Drive files are submitted by backfill/sync jobs.
2. Ingestion normalization maps year/specialty/type/date and fingerprints duplicates.
3. Extracted entities become verification tasks with `pending` status.
4. Approved tasks promote document/entity trust status.
5. Snapshot/timeline/AI consume only trusted context where required.

## 2025/2026 Priority Rules
- Heuristics tuned for `2025/*` and `2026/Neurology` naming patterns.
- Duplicate suppression includes 2025 GP CMP trend variants (`(1)`, `(2)`).
- Non-PDF artifacts are ignored at ingestion.

## Reliability Model
- API responses include rejected file reasons.
- Import endpoints log created/duplicate counts for monitoring.
