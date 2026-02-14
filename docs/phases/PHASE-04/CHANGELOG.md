Source of truth for: Completed work and notable changes within this phase.
Do not duplicate: Open tasks from TASK_BOARD.md.

# Phase 04 Changelog — Timeline and Snapshot

## Added
- **Clinician Snapshot Page** (`/snapshot`) - one-page clinical context view with:
  - Active conditions section
  - Current medications section
  - Allergies & sensitivities (alert variant with left border)
  - Recent critical results
  - Recent clinical events
  - Upcoming appointments
  - Changes (30/90 days)
  - Direct document links for each section item
  - Quick action buttons (Timeline, Records, Share)

- **Event Normalization Service** (`lib/services/event-normalization.ts`):
  - `normalizeDocumentToEvent()` - creates ClinicalEvent from DocumentRecord
  - `normalizeDocumentsToEvents()` - batch processing with date/specialty grouping
  - `mergeEvents()` - merges new events avoiding document overlap
  - Condition extraction from tags, specialty, and filename
  - Event type mapping from document types

- **Episode Grouping Service** (`lib/services/episode-grouping.ts`):
  - `groupEventsIntoEpisodes()` - temporal and condition-based clustering
  - `assignEventsToEpisodes()` - assigns new events to existing episodes
  - `recalculateEpisode()` - updates episode metadata from events
  - Configurable maxGapDays (default 30 days)
  - Severity determination (mild/moderate/severe) based on event types
  - Intelligent label generation

- **Timeline API Filters**:
  - `type` - filter by event type (lab_result, imaging_result, etc.)
  - `specialty` - filter by medical specialty
  - `episodeId` - filter events by episode
  - `verified` - filter by verification status (true/false)

- **Timeline UI Enhancements**:
  - `TimelineFilter` client component with dropdowns for type/specialty/verification
  - Event type icons (🧪 lab, 🔬 imaging, 📅 appointment, etc.)
  - Event cards with document drill-down links
  - Episode severity badges with color coding
  - Episode condition tags
  - "View episode events" quick filter link

- **Navigation Update**: Added "Snapshot" to primary nav with document icon

- **Test Suite**:
  - `event-normalization.test.ts` - 13 tests for document→event conversion
  - `episode-grouping.test.ts` - 15 tests for event→episode clustering
  - `phase4-routes.test.ts` - 13 tests for timeline/snapshot store functions

## Changed
- `TimelineFilters` interface expanded with type/specialty/episodeId/verified
- `listTimeline()` store function supports all new filters
- Timeline API route accepts new query parameters
- Timeline page now async Server Component with searchParams

## Fixed
- None required.

## Notes
- Event normalization and episode grouping services are pure functions, ready for integration with ingestion pipeline.
- Snapshot page fetches document details for citation links.
- Episode grouping uses 30-day window by default, configurable per use case.
