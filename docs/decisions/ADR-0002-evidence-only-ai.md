Source of truth for: AI safety boundary decision rationale.
Do not duplicate: Generic product goals or non-AI endpoint requirements.

# ADR-0002: Evidence-Only AI Assistant

## Status
Accepted

## Context
Medical contexts require rapid access to evidence while minimizing clinical risk and unsupported inference.

## Decision
Restrict AI to evidence-only Q&A with citations and confidence. Refuse diagnosis/treatment advice in v1.

## Consequences
- Lower risk of harmful outputs.
- Improves clinician trust via transparent provenance.
- Some user requests will be intentionally declined.
