Source of truth for: Product KPIs, quality thresholds, and acceptance measures.
Do not duplicate: UI component specs or route-level implementation details.

# Success Metrics

## Clinical Usability
- Time-to-relevant-record under 60 seconds for a clinician query.
- Snapshot load under 2 seconds for first paint in normal network conditions.
- At least one source citation for every snapshot assertion.

## Data Quality
- 100% of extracted fields in `pending` until verified.
- 0 unverified fields surfaced as trusted in snapshot or AI output.
- Duplicate import suppression active for known variant filenames (including 2025 CMP trend variants).

## Workflow Reliability
- New PDF sync ingestion success rate >= 99% per day.
- Failed ingestion jobs retried within 15 minutes.
- Verification queue reflects all newly extracted records.

## Security and Access
- 100% of clinician shared views gated by valid token and password.
- 100% of access attempts recorded in audit logs.

## Accessibility
- Keyboard-only completion for records, timeline, and verification views.
- Reduced motion respected across all patient and clinician pages.
