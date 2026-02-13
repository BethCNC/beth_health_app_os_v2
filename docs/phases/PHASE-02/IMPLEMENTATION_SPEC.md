Source of truth for: Engineering design and implementation details for this phase.
Do not duplicate: Product rationale already captured in PRD.md.

# Phase 02 Implementation Spec — Ingestion and Parsing

## Delivered in this iteration
- Added import job orchestration with status lifecycle: `queued -> processing -> completed|failed`.
- Added PDF text extraction service using Python `pdfplumber` fallback path (offline-compatible).
- Added text chunking service for index-ready records.
- Added heuristic extraction service for entities and fields from file text.
- Added import job APIs:
  - `GET /api/import/jobs`
  - `GET /api/import/jobs/:jobId`
- Updated backfill/sync APIs to return `jobId`, status, and job summary.
- Added import console in Settings UI to trigger and inspect jobs.

## Technical design
1. API receives file list or folder+years.
2. Scanner gathers file path + metadata (size, modified timestamp).
3. Normalizer classifies and maps path metadata.
4. Import job orchestrator indexes each non-duplicate document:
   - extract text
   - chunk text
   - infer extraction candidates
   - persist document/fields/entities/chunks in repository state
   - create verification task and clinical event
5. Job summary and per-item outcomes are stored and queryable.

## Interfaces added/updated
- `ImportJob`, `ImportJobItem`, `ImportJobSummary`, `ImportJobStatus`
- `DocumentChunk`, `ExtractedEntity`
- `runImportJob(...)`
- `listImportJobs()`, `getImportJobById(...)`
- `listDocumentChunksByDocumentId(...)`
- `listExtractedFieldsByDocumentId(...)`
- `listExtractedEntitiesByDocumentId(...)`

## Data considerations
- All extracted fields/entities remain `pending` by default.
- Duplicate fingerprint suppression stays active.
- Parse failures still create records with `parseStatus=failed` for visibility.

## Risks and mitigations
- Risk: extraction quality varies by PDF structure.
  - Mitigation: explicit parse status, indexed chunk preview, and mandatory verification.
- Risk: local environment may not have npm network access.
  - Mitigation: use preinstalled Python `pdfplumber` instead of npm parser dependency.
