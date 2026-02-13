Source of truth for: Security controls, access model, and audit requirements.
Do not duplicate: Styling rules or component-level accessibility guidance.

# Security Model

## Access Controls
- Patient-admin access for write operations.
- Provider read access only through expiring share token + password.
- No provider accounts/RBAC in v1.

## Data Protection
- Encrypted transport (HTTPS) and encrypted-at-rest managed by platform.
- Passwords stored only as salted hashes.
- Strict Firebase rules (least privilege).

## Audit Requirements
- Log every import, verification action, share-link action, and AI query.
- Include actor, timestamp, and relevant identifiers.

## Session and Operational Safety
- Session timeout and re-auth for sensitive patient operations.
- Redaction support for sensitive pages/fields before sharing.
- Secret values never rendered in browser output.

## Non-goals
- HIPAA certification in v1.
