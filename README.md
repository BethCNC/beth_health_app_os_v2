# beth_health_os_v2

Next.js + TypeScript + Tailwind prototype for a clinician-first medical record operating system.

## Current Implementation
- App routes: `/dashboard`, `/records`, `/timeline`, `/verification`, `/share`, `/appointments`, `/settings`
- Clinician route: `/c/[shareToken]`
- API routes:
  - `POST /api/import/backfill`
  - `POST /api/import/sync`
  - `GET /api/import/jobs`
  - `GET /api/import/jobs/:jobId`
  - `GET /api/firebase/status`
  - `GET /api/records`
  - `GET /api/timeline`
  - `POST /api/verification/:entityId/approve`
  - `POST /api/verification/:entityId/reject`
  - `POST /api/share-links`
  - `GET /api/share-links`
  - `GET /api/share-links/:token?password=...`
  - `POST /api/ai/query`

## Ingestion Focus
Parser and normalization logic is currently tuned against the real 2025 and 2026 folder patterns from Google Drive.
Phase 02 pipeline now performs:
- PDF text extraction
- chunk indexing
- heuristic entity/field extraction
- verification task creation
- import job tracking
- inline retries with dead-letter capture for failed items

## Setup
1. Install dependencies: `npm install`
2. Copy env template values into `.env.local`
3. Start dev server: `npm run dev`

## Extraction dependency
This build uses Python `pdfplumber` for PDF text extraction in server-side import jobs. Verify availability:
```bash
python3 - <<'PY'
import importlib.util
print("pdfplumber", bool(importlib.util.find_spec("pdfplumber")))
PY
```

## Optional Firestore persistence dependency
Import and verification artifacts can be persisted to Firestore when both are present:
1. `firebase-admin` installed in project dependencies
2. Admin credentials in `.env.local` (`FIREBASE_SERVICE_ACCOUNT_JSON` or split admin vars)

Check runtime status from:
- Settings page (`Data store status`)
- `GET /api/firebase/status`

When Firestore persistence is enabled, read paths auto-switch to Firestore-backed queries and fall back to in-memory on read failures.

## Tests
- Run test suite: `npm run test`
- Watch mode: `npm run test:watch`

## Backfill Example (2025 + 2026)
```bash
curl -X POST http://localhost:3000/api/import/backfill \
  -H "Content-Type: application/json" \
  -d '{
    "rootPath": "/Users/bethcartrette/Library/CloudStorage/GoogleDrive-beth@bethcnc.com/My Drive/Health/MEDICAL RECORDS BY YEAR",
    "years": [2025, 2026],
    "initiatedBy": "beth"
  }'
```

## Documentation
See `/docs` for product, architecture, design, ADRs, and phase-by-phase execution packs.
