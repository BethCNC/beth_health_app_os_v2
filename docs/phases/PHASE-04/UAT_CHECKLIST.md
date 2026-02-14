Source of truth for: User acceptance validation steps for this phase.
Do not duplicate: Internal implementation details from engineering docs.

# Phase 04 UAT Checklist — Timeline and Snapshot

## Preconditions
- [x] Required environment variables configured
- [x] Required seed/test data available (events, episodes, documents)

## Checklist

### Clinician Snapshot Page (`/snapshot`)
- [x] Page accessible via navigation menu
- [x] Generated timestamp displayed
- [x] Active Conditions section renders
- [x] Current Medications section renders
- [x] Allergies & Sensitivities section renders with alert styling
- [x] Recent Critical Results section renders
- [x] Recent Clinical Events section renders
- [x] Upcoming Appointments section renders
- [x] Changes (30 days) section renders
- [x] Changes (90 days) section renders
- [x] Each section item shows source document count
- [x] Document links navigate to record detail page
- [x] Quick action buttons work (Timeline, Records, Share)

### Timeline Page (`/timeline`)
- [x] Page loads with events and episodes
- [x] Events sorted latest-first
- [x] Event cards show type icon, title, status badge
- [x] Event cards show date, specialty, conditions
- [x] Event cards show summary text
- [x] Event cards show source document links
- [x] Document links navigate to record detail page
- [x] Episodes show label, date range, severity badge
- [x] Episodes show condition focus tags
- [x] "View episode events" link filters correctly

### Timeline Filters
- [x] Event Type dropdown filters events
- [x] Specialty dropdown filters events
- [x] Verification dropdown filters events
- [x] Condition text input filters events
- [x] Clear filters button resets all filters
- [x] Filter count indicator shows active filter count
- [x] URL updates with filter parameters
- [x] Page reload preserves filters

### Event Normalization
- [x] Lab documents create lab_result events
- [x] Imaging documents create imaging_result events
- [x] Appointment notes create appointment events
- [x] Conditions extracted from tags and specialty
- [x] Verification status flows from document to event

### Episode Grouping
- [x] Events within 30 days grouped together
- [x] Events with shared conditions grouped together
- [x] Episode severity reflects event types
- [x] Episode labels are descriptive

### Navigation
- [x] "Snapshot" appears in primary navigation
- [x] Snapshot icon displays correctly
- [x] Active state highlights current page

### Accessibility
- [x] Timeline filter controls keyboard accessible
- [x] Document links have clear focus states
- [x] Color contrast meets WCAG requirements
- [x] Screen reader can navigate sections

## Sign-off
- [x] UAT complete
- [x] Defects triaged (none found)
- [x] Ready for next phase
