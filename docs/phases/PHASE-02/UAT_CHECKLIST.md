Source of truth for: User acceptance validation steps for this phase.
Do not duplicate: Internal implementation details from engineering docs.

# Phase 02 UAT Checklist — Ingestion and Parsing

## Preconditions
- Local environment has Python `pdfplumber` available.
- Google Drive local folder path is accessible.

## Checklist
1. In `/settings`, run `backfill` for `2025,2026`.
2. Confirm job status is `completed` or `failed` with explicit error messages.
3. Confirm summary counts reflect scanned/created/duplicate/rejected/failed totals.
4. Open a newly imported record and confirm:
   - parse status shown
   - extracted fields listed
   - extracted entities listed
   - chunk previews listed
5. Open verification page and confirm imported docs appear in pending queue.

## Sign-off
- [ ] UAT complete
- [ ] Defects triaged
- [ ] Ready for Phase 03 hardening
