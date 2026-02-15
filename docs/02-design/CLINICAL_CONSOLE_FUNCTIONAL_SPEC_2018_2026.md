# Functional Specification: The Clinical Console (2018-2026)

## 1. Core Philosophy: "Diagnostic Synthesis"

The interface is built for professional clinical utility. It prioritizes rapid assembly of a mental model for complex, systemic cases over traditional document storage.

### The 15-Second Rule
- A specialist must identify systemic status, primary diagnoses, and latest major clinical event within 15 seconds of opening a patient profile.

### Zero-Loss Context
- All views must maintain primary list context.
- Use a split-view or persistent drawer pattern to prevent back-and-forth list/detail navigation.

### Systemic Clustering
- Organize data by physiological system (immunological, neurological, GI, autonomic, connective, cardio) rather than only by specialty.

## 2. Information Architecture and Component Logic

### A. Lead Panel (Global Context)
Non-scrolling persistent header with clinical identity and current systemic state.

- Data Slot 1 (Identity): Photo, Age/Sex, Blood Type, Primary Diagnosis List (hEDS, MCAS, POTS).
- Data Slot 2 (Systemic Status): Three status indicators driven by latest `system_tag` data (example: IMMUNE: REACTIVE, GI: STABLE, NEURO: MONITORING).
- Data Slot 3 (Timeline Navigation): Global year range selector (2018-2026). Selecting a year filters all sub-views.

### B. Master Archive (Universal Grid)
High-density spreadsheet for scanning 8 years of records.

- Interaction: Selecting a row updates the Preview Drawer state.
- Columns:
  - Date: `YYYY-MM-DD` (sortable)
  - Type: `Lab | Scan | Note | Flare | Med Change | Surgery`
  - System: `GI | Autonomic | Connective Tissue | ...`
  - Title: Descriptive record name
  - Provider: Physician and network
  - Impression Snippet: 1-line clinical bottom-line
- Faceted Search: Multi-parameter queries such as "Scans in 2021 tagged Neuro".

### C. Flowsheet (Longitudinal Lab Trends)
Horizontal grid for biomarkers across networks and reference ranges.

- Fixed row headers for test names, horizontal scrolling dates.
- Group tests by LOINC/common-name equivalence.
- Cell logic:
  - numerical value
  - out-of-range indicator in red/bold
  - reference range visible per date
- Clicking a row header shows a trend line over the multi-year delta.

### D. Visual Timeline (Event Correlation)
Horizontal multi-track timeline (Gantt-style) for event correlation.

- Track 1: Flare intensity heatmap (green-to-red)
- Track 2: Medication spans (start/stop)
- Track 3: Interventions (surgery, ER, major imaging icons)
- Track 4: Vitals overlays (HR/BP spikes)
- Zooming into a date window must sync the Master Archive date range.

### E. Preview Drawer (Detail View)
Side panel for rapid review without losing Archive position.

- Impression Box: "So What?" summary
- Evidence Gallery: Horizontal thumbnails, click to lightbox
- Timeline Context: Related events widget (`+/- 7 days`)
- Action Bar: `Download Original | Copy Summary | Flag for Next Specialist`

## 3. Specialized Data Objects

### A. Flare Event Object
Treat flares as event wrappers that group heterogeneous data.

- Metadata: start/end date, trigger, severity (1-10)
- Grouped data: labs/imaging in the flare window pinned to flare
- Visual evidence: before/during/after comparison slider when applicable

### B. Specialist Network Map
Directory of 12+ providers organized by system interdependency.

- Groups: `Autonomic/Cardio`, `Immunological`, `Connective Tissue/Ortho`
- One-click provider history across the full timeline

## 4. User Flows (Professional Context)

### Flow 1: New Specialist Handover
1. Specialist opens app.
2. Reviews Lead Panel.
3. Uses Visual Timeline to compare meds vs flares over prior years.
4. Filters Master Archive to specialty plus related systems.

### Flow 2: Rapid Lab Comparison
1. Doctor opens Flowsheet.
2. Pins key labs (example: Tryptase and CRP).
3. Scrolls longitudinally to evaluate baseline shifts over time.
4. Selects a high value and opens source PDF in Preview Drawer.

## 5. Technical Requirements for Implementation

### OCR Search Engine
- Every uploaded PDF must be indexed for full-text search.
- Querying a term (example: "Stenosis") should surface specific report pages.

### Data Schema
- `record_id: UUID`
- `timestamp: ISO8601`
- `system_tag: [neuro, immune, gi, cardio, autonomic, connective]`
- `clinical_severity: [low, normal, high, critical]`

### Performance
- Master Archive must use virtualization to support 1,000+ entries with sub-second filter response.

### Export Logic
- Support generation of a clinical brief PDF from filtered data (example: abnormal labs 2023-2025).
