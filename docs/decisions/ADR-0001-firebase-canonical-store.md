Source of truth for: Architecture decision rationale for canonical storage.
Do not duplicate: API payload examples or UI copy.

# ADR-0001: Firebase as Canonical Data Store

## Status
Accepted

## Context
Data can exist in Google Drive and historical Notion databases, but a single canonical structured source is required for consistency, queryability, and verification state handling.

## Decision
Use Firebase (Firestore + Storage) as canonical v1 source of truth. Treat Notion as read-only migration reference only.

## Consequences
- Simplifies conflict resolution and trust model.
- Reduces dual-write complexity.
- Requires migration tooling for historical Notion records.
