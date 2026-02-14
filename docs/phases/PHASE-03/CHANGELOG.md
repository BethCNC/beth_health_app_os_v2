Source of truth for: Completed work and notable changes within this phase.
Do not duplicate: Open tasks from TASK_BOARD.md.

# Phase 03 Changelog — Verification and Record UX

## Added
- **Searchable records library** with full-text search across filenames, tags, and chunk content.
- **Records filter UI** (`RecordsFilter` component) with filters for:
  - Text search query
  - Document type
  - Specialty
  - Verification status (trusted/pending/rejected)
  - Date range (from/to)
- **Verification status filter** support in `RecordFilters` interface and record listing APIs.
- **Enhanced verification inbox** with document context, inline field preview, and reviewer notes.
- **Field-level inline verification** (`FieldVerificationList` component) on record detail page.
- **Field verification API routes**: `POST /api/verification/field/[fieldId]/approve` and `reject`.
- **Store functions** for field-level approval/rejection: `approveField()`, `rejectField()`.
- **Phase 3 API test suite** covering:
  - Records API with status/type/specialty/query filters
  - Field-level verification approve/reject flows
  - Validation and error handling
- **Keyboard navigation** for verification queue:
  - `↑↓` to navigate between tasks
  - `Enter` to approve focused task
  - `Delete` to reject focused task
  - `e` to expand/collapse task details
  - Visual focus indicator with blue border
  - ARIA attributes for accessibility (`role="listbox"`, `role="option"`, `aria-selected`)
- **Bulk verification actions**: "Approve all normal priority" button for batch approval of non-high-priority tasks.
- **VerificationQueue component tests** (12 tests) covering keyboard navigation, bulk actions, and accessibility.
- Initial documentation scaffold for phase execution.

## Changed
- Records page now shows filtered results count and active filter indicators.
- Record detail page extracted fields section replaced with interactive verification list.
- Verification inbox enriches tasks with document metadata and pending field counts.
- Verification queue distinguishes pending vs. resolved tasks with separate sections.
- API `/api/records` route accepts `status` query parameter.
- Store `listRecords` and Firestore `listRecordsFromFirestore` now filter by `verificationStatus`.

## Fixed
- None required.

## Notes
- Field-level verification currently uses in-memory store only; Firestore persistence can be added in future phase.
- Default records view shows 2025/2026 files; filters override this default.
- Verification tasks show high-priority highlighting with amber border.
