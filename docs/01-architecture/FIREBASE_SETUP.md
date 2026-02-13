Source of truth for: Firebase bootstrap, local config files, and deployment commands.
Do not duplicate: Firestore entity definitions (see DATA_MODEL.md).

# Firebase Setup

## What is already configured
- `.env.local` keys for Firebase Web app config.
- Local Firebase config files in repo:
  - `firebase.json`
  - `firestore.rules`
  - `firestore.indexes.json`
  - `storage.rules`
- Runtime persistence adapter:
  - `lib/firebase/admin-runtime.js`
  - `lib/repositories/firestore-persistence.ts`

## One-time CLI setup
1. `firebase login --reauth`
2. `firebase use --add` and select this project.
3. Optionally persist alias with `.firebaserc`.

## Deploy baseline config
1. `firebase deploy --only firestore:rules`
2. `firebase deploy --only firestore:indexes`
3. `firebase deploy --only storage`

## Verify local env
- `node scripts/check-firebase-env.mjs`

## Enable server-side Firestore persistence
Add one of these in `.env.local`:

Option A (recommended):
- `FIREBASE_SERVICE_ACCOUNT_JSON=<single-line JSON>`

Option B (split vars):
- `FIREBASE_ADMIN_PROJECT_ID=...`
- `FIREBASE_ADMIN_CLIENT_EMAIL=...`
- `FIREBASE_ADMIN_PRIVATE_KEY=\"-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n\"`

When configured and `firebase-admin` is installed, import and verification artifacts are persisted to:
- `import_jobs`
- `documents`
- `document_chunks`
- `extracted_entities`
- `extracted_fields`
- `verification_tasks`
- `clinical_events`

## Recommended next step
- Install `firebase-admin` and switch read paths from in-memory to Firestore query-backed repositories.
