/* eslint-disable @typescript-eslint/no-require-imports */

import type {
  ClinicalEvent,
  DocumentChunk,
  DocumentRecord,
  ExtractedEntity,
  ExtractedField,
  ImportJob,
  VerificationTask
} from "@/lib/types/domain";

// Optional runtime bridge so the app still builds when firebase-admin is not installed.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const adminRuntime = require("../firebase/admin-runtime.js") as {
  getAdminContext: () => { enabled: boolean; reason?: string };
  setDocument: (collectionName: string, id: string, data: unknown) => Promise<{ enabled: boolean; reason?: string }>;
  batchSetDocuments: (
    collectionName: string,
    items: Array<{ id: string; data: unknown }>
  ) => Promise<{ enabled: boolean; reason?: string }>;
};

interface PersistImportPayload {
  job: ImportJob;
  documents: DocumentRecord[];
  chunks: DocumentChunk[];
  entities: ExtractedEntity[];
  fields: ExtractedField[];
  tasks: VerificationTask[];
  events: ClinicalEvent[];
}

interface PersistResult {
  enabled: boolean;
  reason?: string;
  writtenCollections: string[];
}

export function getFirestorePersistenceStatus(): { enabled: boolean; reason?: string } {
  const context = adminRuntime.getAdminContext();
  return { enabled: Boolean(context.enabled), reason: context.reason };
}

export async function persistImportPayload(payload: PersistImportPayload): Promise<PersistResult> {
  const context = adminRuntime.getAdminContext();
  if (!context.enabled) {
    return {
      enabled: false,
      reason: context.reason,
      writtenCollections: []
    };
  }

  const writtenCollections: string[] = [];

  await adminRuntime.setDocument("import_jobs", payload.job.id, payload.job);
  writtenCollections.push("import_jobs");

  await persistCollection("documents", payload.documents);
  writtenCollections.push("documents");

  await persistCollection("document_chunks", payload.chunks);
  writtenCollections.push("document_chunks");

  await persistCollection("extracted_entities", payload.entities);
  writtenCollections.push("extracted_entities");

  await persistCollection("extracted_fields", payload.fields);
  writtenCollections.push("extracted_fields");

  await persistCollection("verification_tasks", payload.tasks);
  writtenCollections.push("verification_tasks");

  await persistCollection("clinical_events", payload.events);
  writtenCollections.push("clinical_events");

  return {
    enabled: true,
    writtenCollections
  };
}

export async function persistVerificationArtifacts(payload: {
  documentId: string;
  document?: DocumentRecord;
  fields: ExtractedField[];
  entities: ExtractedEntity[];
  task: VerificationTask;
  events: ClinicalEvent[];
}): Promise<PersistResult> {
  const context = adminRuntime.getAdminContext();
  if (!context.enabled) {
    return { enabled: false, reason: context.reason, writtenCollections: [] };
  }

  const writtenCollections: string[] = [];

  if (payload.document) {
    await adminRuntime.setDocument("documents", payload.document.id, payload.document);
    writtenCollections.push("documents");
  }

  await persistCollection("extracted_fields", payload.fields);
  writtenCollections.push("extracted_fields");

  await persistCollection("extracted_entities", payload.entities);
  writtenCollections.push("extracted_entities");

  await adminRuntime.setDocument("verification_tasks", payload.task.id, payload.task);
  writtenCollections.push("verification_tasks");

  await persistCollection("clinical_events", payload.events);
  writtenCollections.push("clinical_events");

  return { enabled: true, writtenCollections };
}

async function persistCollection<T extends { id: string }>(collectionName: string, values: T[]): Promise<void> {
  if (values.length === 0) {
    return;
  }

  await adminRuntime.batchSetDocuments(
    collectionName,
    values.map((item) => ({
      id: item.id,
      data: item
    }))
  );
}
