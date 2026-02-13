Source of truth for: Completed work and notable changes within this phase.
Do not duplicate: Open tasks from TASK_BOARD.md.

# Phase 02 Changelog — Ingestion and Parsing

## Added
- Import job model and lifecycle tracking.
- `/api/import/jobs` and `/api/import/jobs/:jobId` endpoints.
- PDF extraction service (`pdfplumber` via Python child process).
- Text chunking service and extraction heuristics service.
- Import console UI in Settings.
- Record detail sections for fields, entities, and chunk previews.
- Optional Firestore persistence adapter for import and verification artifacts.
- `/api/firebase/status` endpoint and settings visibility for persistence runtime status.

## Changed
- Backfill/sync APIs now orchestrate import jobs and return structured job summaries.
- Local drive scanner now captures file metadata (size + modified time).

## Fixed
- Removed metadata-only ingestion behavior by adding parsing/indexing pipeline.

## Notes
- Runtime store remains in-memory for read/query paths.
- Firestore persistence writes are active when `firebase-admin` + admin credentials are configured.
