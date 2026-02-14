Source of truth for: Engineering design and implementation details for this phase.
Do not duplicate: Product rationale already captured in PRD.md.

# Phase 04 Implementation Spec — Timeline and Snapshot

## Technical Deliverables

### 1. Clinician Snapshot Page
- **Route**: `/app/snapshot/page.tsx`
- **Component**: Server Component fetching `getClinicalSnapshot()` and `getDocumentsByIds()`
- **Sections**: Active conditions, medications, allergies (alert variant), critical results, recent events, appointments, 30/90 day changes
- **Features**: Document citation links, generated timestamp, quick action buttons

### 2. Event Normalization Service
- **File**: `lib/services/event-normalization.ts`
- **Functions**:
  - `normalizeDocumentToEvent(doc)` → `ClinicalEvent`
  - `normalizeDocumentsToEvents(docs)` → `ClinicalEvent[]` (with grouping)
  - `mergeEvents(existing, new)` → `ClinicalEvent[]`
- **Logic**: Maps document types to event types, extracts conditions from tags/specialty/filename

### 3. Episode Grouping Service
- **File**: `lib/services/episode-grouping.ts`
- **Functions**:
  - `groupEventsIntoEpisodes(events, config?)` → `ClinicalEpisode[]`
  - `assignEventsToEpisodes(events, episodes)` → `{ events, episodes }`
  - `recalculateEpisode(episode, events)` → `ClinicalEpisode`
- **Config**: `maxGapDays` (default 30), `minEventsForEpisode`, `groupByCondition`

### 4. Timeline API Enhancements
- **Filters Added**: `type`, `specialty`, `episodeId`, `verified`
- **Interface**: `TimelineFilters` in `lib/repositories/store.ts`
- **Route**: `app/api/timeline/route.ts` accepts all filter params

### 5. Timeline UI Components
- **TimelineFilter**: `components/timeline/TimelineFilter.tsx` (client component)
- **EventTypeIcon**: Inline helper with emoji icons
- **SeverityBadge**: Inline helper with color-coded badge

## Interfaces

### TimelineFilters (Updated)
```typescript
interface TimelineFilters {
  from?: string;
  to?: string;
  condition?: string;
  type?: string;       // NEW
  specialty?: string;  // NEW
  episodeId?: string;  // NEW
  verified?: boolean;  // NEW
}
```

### Event Type Mapping
| DocumentType | EventType |
|--------------|-----------|
| lab | lab_result |
| imaging | imaging_result |
| appointment_note | appointment |
| summary | note |
| letter | note |
| unknown | note |

## Data Considerations
- Event normalization is a pure function, does not persist events
- Episode grouping uses 30-day window for temporal clustering
- Snapshot generation fetches current state on each request
- Document citation links use `getDocumentsByIds()` for metadata

## Risks and Mitigations
| Risk | Mitigation |
|------|------------|
| Event duplication | `mergeEvents()` checks documentIds overlap |
| Episode fragmentation | Configurable `maxGapDays` parameter |
| Snapshot staleness | `generatedAt` timestamp shows recency |
| Filter complexity | URL-based state enables sharing/bookmarking |
