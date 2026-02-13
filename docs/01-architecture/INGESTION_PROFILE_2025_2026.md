Source of truth for: Real-world Drive structure and parser rules for 2025-2026 records.
Do not duplicate: Global architecture decisions or UI behavior specs.

# Ingestion Profile (2025-2026)

## Observed Structure
- Root: `.../MEDICAL RECORDS BY YEAR/2025/*` and `.../2026/Neurology/*`
- 2025 specialist folders: Cardiology, Endocrinology, GP, Gastro, MCAS, Neurology, Psych, Rheumatology, Vascular
- 2026 specialist folders: Neurology

## Volume Snapshot
- 2025: 54 files total, 47 PDFs, 7 non-PDF artifacts
- 2026: 7 files total, 4 PDFs, 3 non-PDF artifacts

## Non-PDF Noise to Ignore
- `.DS_Store`
- `.gdoc`
- `.png`
- `.md`
- `.jsx`
- extensionless local artifacts

## Naming Patterns
- Appointment/notes: `appt`, `visit`, `consult`, `summary`
- Imaging: `MRI`, `CT`, `angiogram`, `xray`, `EMG`
- Labs: `Result Trends`, `Test Details`, `panel`, `CBC`, `biopsy`
- Letters: `Letter - N` in MCAS subfolder

## Known Duplicate Pattern
- `Result Trends - Comprehensive Metabolic Panel - Jan 20, 2025.PDF`
- same file repeated as `(1)` and `(2)` variants
- fingerprint normalization collapses these variants into one canonical document

## v1 Ingestion Rules
1. Accept only `.pdf`.
2. Parse `year/specialty[/subfolder]/filename`.
3. Normalize specialty aliases (`GP -> primary_care`, `Gastro|GI -> gastroenterology`, `MCAS -> immunology_mcas`).
4. Infer document type from filename heuristics.
5. Create pending verification task for every extracted field.
