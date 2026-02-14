Source of truth for: User acceptance validation steps for this phase.
Do not duplicate: Internal implementation details from engineering docs.

# Phase 03 UAT Checklist — Verification and Record UX

## Preconditions
- [x] Required environment variables configured.
- [x] Required seed/test data available.

## Checklist

### Records Library
- [x] Records page loads with filter UI
- [x] Text search filters by filename, tags, chunk content
- [x] Document type dropdown filters correctly
- [x] Specialty dropdown filters correctly
- [x] Verification status filter shows trusted/pending/rejected
- [x] Date range filters apply to record dates
- [x] Filter count badge shows active filter count
- [x] Clear filters button resets all filters

### Verification Inbox
- [x] Verification page shows enriched tasks with document context
- [x] High priority tasks display amber border highlight
- [x] Pending fields count shown per task
- [x] Expand/collapse reveals inline field preview
- [x] Approve button calls API and refreshes page
- [x] Reject button opens notes field and submits rejection
- [x] Resolved tasks appear in separate "Recently resolved" section

### Field-Level Verification
- [x] Record detail page shows FieldVerificationList component
- [x] Each extracted field shows value and verification status
- [x] Approve button on field updates status to "verified"
- [x] Reject button on field updates status to "rejected"

### Keyboard Navigation
- [x] Arrow up/down navigates between tasks
- [x] Enter key approves focused task
- [x] Delete key rejects focused task
- [x] 'e' key toggles expand/collapse
- [x] Focus indicator visible (blue border)
- [x] Tab key moves between controls within task

### Bulk Verification
- [x] "Approve all normal priority" button visible when normal tasks exist
- [x] Button hidden when only high priority tasks exist
- [x] Bulk approve processes all normal priority tasks
- [x] Progress shown during bulk operation

### Accessibility
- [x] ARIA role="listbox" on task container
- [x] ARIA role="option" on each task item
- [x] aria-selected attribute reflects focus state
- [x] Keyboard shortcuts hint displayed clearly
- [x] All functionality accessible without mouse

### Error Handling
- [x] 404 returned for unknown field verification
- [x] 400 returned for invalid payload
- [x] Error messages displayed to user
- [x] Loading states shown during API calls

## Sign-off
- [x] UAT complete
- [x] Defects triaged (none found)
- [x] Ready for next phase
