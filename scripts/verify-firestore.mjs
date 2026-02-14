#!/usr/bin/env node
/**
 * Quick script to verify Firestore collections have documents
 */

import fs from "fs";
import { createRequire } from "module";

const envPath = ".env.local";
if (!fs.existsSync(envPath)) {
  console.error("❌ .env.local not found");
  process.exit(1);
}

const raw = fs.readFileSync(envPath, "utf8");
const getEnv = (key) => {
  const m = raw.match(new RegExp(`^${key}=(.*)$`, "m"));
  return m ? m[1].trim() : null;
};

const serviceAccountJson = getEnv("FIREBASE_SERVICE_ACCOUNT_JSON");
if (!serviceAccountJson) {
  console.error("❌ FIREBASE_SERVICE_ACCOUNT_JSON not set");
  process.exit(1);
}

const require = createRequire(import.meta.url);
const admin = require("firebase-admin");

const serviceAccount = JSON.parse(serviceAccountJson);

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: getEnv("NEXT_PUBLIC_FIREBASE_PROJECT_ID")
});

const db = admin.firestore();

const collections = [
  "import_jobs",
  "documents",
  "document_chunks",
  "extracted_entities",
  "extracted_fields",
  "verification_tasks",
  "clinical_events"
];

console.log("\n📊 Firestore Collection Counts\n");

for (const name of collections) {
  try {
    const snapshot = await db.collection(name).get();
    const count = snapshot.size;
    const status = count > 0 ? "✅" : "⚠️ ";
    console.log(`${status} ${name.padEnd(20)} ${count} documents`);
  } catch (error) {
    console.log(`❌ ${name.padEnd(20)} Error: ${error.message}`);
  }
}

console.log("\n");
process.exit(0);
