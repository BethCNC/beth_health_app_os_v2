Source of truth for: Automated and manual test coverage for this phase.
Do not duplicate: Product-level goals from PRD.md.

# Phase 04 Test Plan — Timeline and Snapshot

## Automated Tests

### Event Normalization (`tests/services/event-normalization.test.ts`) — 13 tests ✅
- Creates event from lab/imaging/appointment documents
- Extracts conditions from tags
- Marks event as verified when document is verified
- Uses createdAt when eventDate is missing
- Groups documents by date and specialty
- Creates separate events for different specialties on same day
- Sorts events by date descending
- Merges non-overlapping events
- Skips events with overlapping document IDs

### Episode Grouping (`tests/services/episode-grouping.test.ts`) — 15 tests ✅
- Groups events within 30 days into same episode
- Creates separate episodes for events >30 days apart
- Creates separate episodes for different conditions
- Groups events by specialty when no conditions specified
- Determines severity based on event types
- Generates meaningful episode labels
- Respects custom maxGapDays config
- Assigns event to matching episode
- Does not assign event outside time window
- Does not assign event with different conditions
- Extends episode end date when event is later
- Updates conditionFocus from events
- Updates severity based on events
- Regenerates label based on events

### Timeline and Snapshot Store (`tests/api/phase4-routes.test.ts`) — 13 tests ✅
- Returns events filtered by date range
- Returns events filtered by condition
- Returns events filtered by type
- Returns events filtered by specialty
- Returns events filtered by verification status
- Returns related episodes for filtered events
- Sorts events by date descending
- Combines multiple filters
- Returns snapshot with all required sections
- Includes source document IDs in section items
- Includes recent events
- Includes critical results from imaging and labs
- Generates timestamp on each call

## Manual Tests
- ✅ Snapshot page renders all sections
- ✅ Document links navigate to correct record detail
- ✅ Timeline filters update URL and results
- ✅ Episode "View episode events" link filters correctly
- ✅ Event type icons display correctly
- ✅ Severity badges show appropriate colors
- ✅ Navigation includes Snapshot link with icon

## Pass/Fail Criteria
- ✅ No critical regressions (76 tests passing)
- ✅ Acceptance scenarios complete with expected outputs
- ✅ Snapshot page accessible and readable
- ✅ Timeline filters functional
