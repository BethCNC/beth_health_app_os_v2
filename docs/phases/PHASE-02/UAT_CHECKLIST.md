Source of truth for: User acceptance validation steps for this phase.
Do not duplicate: Internal implementation details from engineering docs.

# Phase 02 UAT Checklist — Ingestion and Parsing

## Preconditions
- Local environment has Python `pdfplumber` available.
- `firebase-admin` dependency is installed.
- Google Drive local folder path is accessible.
- Admin credentials are configured in `.env.local` if Firestore mode is desired.

## Checklist
1. In `/settings`, confirm:
   - Firestore persistence status is accurate.
   - Read mode reflects current runtime (`Firestore` or `In-memory`).
2. In `/settings`, run `backfill` for `2025,2026`.
3. Confirm each job shows:
   - status (`completed`/`failed`)
   - summary counts for scanned/created/duplicates/rejected/failed
   - retry and dead-letter counters
4. Open a newly imported record and confirm:
   - parse status shown
   - extracted fields listed
   - extracted entities listed
   - chunk previews listed
5. Open verification page and confirm imported docs appear in pending queue.
6. Approve/reject at least one task and confirm status changes are reflected.
7. If Firestore mode is enabled, hit `GET /api/firebase/status` and confirm it matches Settings status.

## Sign-off
- [ ] UAT complete
- [ ] Defects triaged
- [ ] Ready for Phase 03 hardening
