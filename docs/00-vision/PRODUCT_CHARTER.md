Source of truth for: Product purpose, scope boundaries, user outcomes, and release intent.
Do not duplicate: Detailed API contracts, schema details, or task-level implementation steps.

# Product Charter

## Product Name
Beth Health OS v2

## Mission
Create a single longitudinal medical intelligence workspace where cross-network specialists can access complete, verifiable context quickly.

## Primary Users
- Patient admin user (you) managing ingestion, verification, and sharing.
- External clinicians consuming snapshot, timeline, and source records through controlled share links.

## v1 Outcomes
- Aggregate and normalize records from Google Drive year/specialist folders.
- Enforce manual verification for all extracted fields before trust.
- Provide one-page clinician snapshot with direct evidence links.
- Offer event-level timeline grouped into episodes.
- Support evidence-only AI Q&A with citations and confidence.

## Scope
- In: document ingestion, extraction workflow, verification queue, records search, snapshot/timeline views, provider sharing.
- Out: bi-directional Notion sync, full provider account portal, billing workflows, EHR write-back.

## Release Constraints
- Personal-use security target (not formal HIPAA certification in v1).
- React + TypeScript + Tailwind + Next.js full-stack.
- Firebase canonical data store.

## UX Principles
- Minimize clinician cognitive load.
- Keep provenance visible for every synthesis.
- Default to low-stimulus accessible interaction patterns.
