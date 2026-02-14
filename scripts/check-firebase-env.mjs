import fs from "fs";
import { createRequire } from "module";

const envPath = ".env.local";
const required = [
  "NEXT_PUBLIC_FIREBASE_API_KEY",
  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
  "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
  "NEXT_PUBLIC_FIREBASE_APP_ID"
];

const optionalAdmin = [
  "FIREBASE_SERVICE_ACCOUNT_JSON",
  "FIREBASE_ADMIN_PROJECT_ID",
  "FIREBASE_ADMIN_CLIENT_EMAIL",
  "FIREBASE_ADMIN_PRIVATE_KEY"
];

if (!fs.existsSync(envPath)) {
  console.error(".env.local not found");
  process.exit(1);
}

const raw = fs.readFileSync(envPath, "utf8");
let missing = 0;
for (const key of required) {
  const m = raw.match(new RegExp(`^${key}=(.*)$`, "m"));
  const ok = Boolean(m && m[1] && m[1].trim().length > 0);
  console.log(`${key}: ${ok ? "SET" : "MISSING"}`);
  if (!ok) missing += 1;
}

if (missing > 0) {
  process.exit(1);
}

const req = createRequire(import.meta.url);
let firebaseAdminInstalled = false;
try {
  req.resolve("firebase-admin");
  firebaseAdminInstalled = true;
} catch {
  firebaseAdminInstalled = false;
}

console.log(`FIREBASE_ADMIN_PACKAGE: ${firebaseAdminInstalled ? "INSTALLED" : "MISSING"}`);

const optionalState = {};
for (const key of optionalAdmin) {
  const m = raw.match(new RegExp(`^${key}=(.*)$`, "m"));
  const ok = Boolean(m && m[1] && m[1].trim().length > 0);
  optionalState[key] = ok;
}

const adminConfigured =
  optionalState.FIREBASE_SERVICE_ACCOUNT_JSON ||
  (optionalState.FIREBASE_ADMIN_PROJECT_ID &&
    optionalState.FIREBASE_ADMIN_CLIENT_EMAIL &&
    optionalState.FIREBASE_ADMIN_PRIVATE_KEY);

console.log(`FIRESTORE_ADMIN_PERSISTENCE: ${adminConfigured ? "READY" : "NOT_CONFIGURED"}`);
