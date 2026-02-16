# Copilot Repository Instructions — Personal EMR (Epic-like)

## Mission
Build a personal EMR-style app with an Epic-inspired UI and workflow using dummy data only.

## Non-negotiables
- Dummy data only. Never generate real patient PHI.
- No secrets or API keys committed.
- No logging full medical records.

## Stack
- Next.js App Router + TypeScript
- Firestore as structured system-of-record
- Google Drive integration later (store references only)

## Architecture rules
- UI must never call Firestore directly.
- All data access goes through `src/lib/data/`.
- Domain types and schemas live in `src/lib/domain/`.

## UX goals (Epic-like layout)
- Left navigation
- Patient context header
- Workspace with tabs:
  Summary, Timeline, Labs, Medications, Documents

## Definition of done
- Types pass
- Lint passes
- Dummy-only data
- Files placed in correct folders