Source of truth for: Automated and manual test coverage for this phase.
Do not duplicate: Product-level goals from PRD.md.

# Phase 03 Test Plan — Verification and Record UX

## Automated Tests

### API Tests (`tests/api/phase3-routes.test.ts`) — 13 tests ✅
- `POST /api/records` with status filter returns filtered records
- `POST /api/records` with trusted status returns only verified
- `GET /api/verification/field/:fieldId/current` returns field state
- `POST /api/verification/field/:fieldId/approve` approves pending field
- `POST /api/verification/field/:fieldId/reject` rejects with reason
- `POST /api/verification/field/:fieldId/approve` returns 404 for unknown field
- `POST /api/verification/field/:fieldId/approve` returns 400 for invalid payload

### Component Tests (`tests/components/verification-queue.test.tsx`) — 12 tests ✅
- Renders pending tasks count
- Shows keyboard shortcuts hint when tasks exist
- Does not show keyboard shortcuts when no pending tasks
- Shows bulk approve button for normal priority tasks
- Does not show bulk approve when only high priority tasks exist
- Displays high priority badge
- Renders document context when available
- Shows resolved tasks section when tasks are resolved
- Renders approve and reject buttons for each task
- Focuses first item by default
- Navigates with arrow keys
- Shows empty state when no pending tasks

### Existing Regression Tests — 10 tests ✅
- Repository tests (runtime selection, ingestion store, import retry)
- Service tests (extraction heuristics)
- Phase 2 route tests

## Manual Tests
- ✅ Verified keyboard navigation (↑↓ navigate, Enter approve, Del reject, e expand)
- ✅ Verified bulk approve button appears only for normal priority tasks
- ✅ Verified records filter with status dropdown
- ✅ Verified field-level inline verification on record detail page
- ✅ Verified ARIA attributes for accessibility (role="listbox", role="option")

## Pass/Fail Criteria
- ✅ No critical regressions (35 tests passing)
- ✅ Acceptance scenarios complete with expected outputs
- ✅ Keyboard navigation fully functional
- ✅ Bulk verification actions working
