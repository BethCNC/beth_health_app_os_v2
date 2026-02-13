Source of truth for: Canonical entities, relationship model, and verification lifecycle.
Do not duplicate: Product narrative, non-technical goals, or UI copy.

# Data Model

## Canonical Collections
- `documents`
- `document_chunks`
- `extracted_entities`
- `verification_tasks`
- `clinical_events`
- `clinical_episodes`
- `appointments`
- `share_links`
- `audit_logs`

## Entity Lifecycle
1. Document imported as `pending`.
2. Extraction produces entities/fields as `pending`.
3. Verification task approves or rejects each extraction group.
4. Trusted documents and fields become `verified` and can drive snapshot/AI trust.

## Required Types
- `DocumentRecord`
- `ExtractedField`
- `VerificationTask`
- `ClinicalEvent`
- `ClinicalEpisode`
- `ClinicalSnapshot`
- `ShareLink`
- `AIAnswerWithCitations`

## Key Constraints
- All extracted fields require manual verification.
- `verificationStatus` must always be explicit.
- Share links must include `expiresAt` and password hash.
- Audit logs are append-only.
