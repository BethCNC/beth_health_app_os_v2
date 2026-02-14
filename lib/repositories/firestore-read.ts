/* eslint-disable @typescript-eslint/no-require-imports */

import type {
  AuditLogEntry,
  ClinicalEvent,
  ClinicalEpisode,
  ClinicalSnapshot,
  DocumentChunk,
  DocumentRecord,
  ExtractedEntity,
  ExtractedField,
  ImportJob,
  ShareLink,
  VerificationTask
} from "@/lib/types/domain";
import { isExpired, nowIso } from "@/lib/utils/date";
import { createId } from "@/lib/utils/ids";
import { verifySecret } from "@/lib/utils/security";
import { persistAuditLog } from "@/lib/repositories/firestore-persistence";
import type { RecordFilters, TimelineFilters } from "@/lib/repositories/store";

interface FirestoreDocumentReference {
  get: () => Promise<FirestoreDocumentSnapshot>;
}

interface FirestoreDocumentSnapshot {
  exists: boolean;
  data: () => unknown;
  ref: FirestoreDocumentReference;
}

interface FirestoreQuerySnapshot {
  docs: FirestoreDocumentSnapshot[];
}

interface FirestoreCollectionReference {
  doc: (id: string) => FirestoreDocumentReference;
  where: (field: string, operator: string, value: unknown) => FirestoreCollectionReference;
  get: () => Promise<FirestoreQuerySnapshot>;
}

interface FirestoreTransaction {
  get: {
    (ref: FirestoreDocumentReference): Promise<FirestoreDocumentSnapshot>;
    (query: FirestoreCollectionReference): Promise<FirestoreQuerySnapshot>;
  };
  set: (ref: FirestoreDocumentReference, data: unknown, options?: { merge?: boolean }) => void;
}

interface FirestoreDb {
  collection: (name: string) => FirestoreCollectionReference;
  runTransaction: <T>(handler: (tx: FirestoreTransaction) => Promise<T>) => Promise<T>;
}

const adminRuntime = require("../firebase/admin-runtime.js") as {
  getAdminContext: () => { enabled: boolean; reason?: string; db?: FirestoreDb };
};

function getDbOrNull(): FirestoreDb | null {
  const context = adminRuntime.getAdminContext();
  if (!context.enabled || !context.db) {
    return null;
  }

  return context.db;
}

function ensureString(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }

  return "";
}

async function readCollection<T>(collectionName: string): Promise<T[]> {
  const db = getDbOrNull();
  if (!db) {
    return [];
  }

  const snapshot = await db.collection(collectionName).get();
  return snapshot.docs.map((doc) => doc.data() as T);
}

async function readDocumentById<T>(collectionName: string, id: string): Promise<T | null> {
  const db = getDbOrNull();
  if (!db) {
    return null;
  }

  const doc = await db.collection(collectionName).doc(id).get();
  return doc.exists ? (doc.data() as T) : null;
}

function normalizeImportJob(job: ImportJob): ImportJob {
  return {
    ...job,
    summary: {
      scanned: job.summary?.scanned ?? 0,
      accepted: job.summary?.accepted ?? 0,
      created: job.summary?.created ?? 0,
      duplicates: job.summary?.duplicates ?? 0,
      rejected: job.summary?.rejected ?? 0,
      failed: job.summary?.failed ?? 0,
      retryAttempts: job.summary?.retryAttempts ?? 0,
      deadLettered: job.summary?.deadLettered ?? 0
    },
    deadLetters: job.deadLetters ?? [],
    errors: job.errors ?? [],
    items: (job.items ?? []).map((item) => ({
      ...item,
      attemptCount: item.attemptCount ?? (item.status === "duplicate" ? 0 : undefined)
    }))
  };
}

export async function listImportJobsFromFirestore(): Promise<ImportJob[]> {
  const jobs = await readCollection<ImportJob>("import_jobs");
  return jobs
    .map((job) => normalizeImportJob(job))
    .sort((a, b) => ensureString(b.createdAt).localeCompare(ensureString(a.createdAt)));
}

export async function getImportJobByIdFromFirestore(jobId: string): Promise<ImportJob | null> {
  const job = await readDocumentById<ImportJob>("import_jobs", jobId);
  return job ? normalizeImportJob(job) : null;
}

export async function listRecordsFromFirestore(filters: RecordFilters): Promise<DocumentRecord[]> {
  const records = await readCollection<DocumentRecord>("documents");
  const query = filters.query?.toLowerCase().trim();

  let chunkMatchDocIds: Set<string> | null = null;
  if (query && query.length > 0) {
    const chunks = await readCollection<DocumentChunk>("document_chunks");
    chunkMatchDocIds = new Set(
      chunks
        .filter((chunk) => ensureString(chunk.text).toLowerCase().includes(query))
        .map((chunk) => chunk.documentId)
    );
  }

  return records
    .filter((record) => {
      if (filters.type && record.type !== filters.type) {
        return false;
      }
      if (filters.specialty && record.specialty !== filters.specialty) {
        return false;
      }
      if (filters.status && record.verificationStatus !== filters.status) {
        return false;
      }
      if (filters.dateFrom && record.eventDate && record.eventDate < filters.dateFrom) {
        return false;
      }
      if (filters.dateTo && record.eventDate && record.eventDate > filters.dateTo) {
        return false;
      }
      if (query) {
        const haystack = `${record.fileName} ${record.specialty} ${record.tags.join(" ")} ${record.textPreview ?? ""}`.toLowerCase();
        if (haystack.includes(query)) {
          return true;
        }
        return chunkMatchDocIds?.has(record.id) ?? false;
      }
      return true;
    })
    .sort((a, b) => (b.eventDate ?? b.createdAt).localeCompare(a.eventDate ?? a.createdAt));
}

export async function getRecordByIdFromFirestore(id: string): Promise<DocumentRecord | null> {
  return readDocumentById<DocumentRecord>("documents", id);
}

export async function listDocumentChunksByDocumentIdFromFirestore(documentId: string): Promise<DocumentChunk[]> {
  const db = getDbOrNull();
  if (!db) {
    return [];
  }

  const snapshot = await db.collection("document_chunks").where("documentId", "==", documentId).get();
  return snapshot.docs
    .map((doc) => doc.data() as DocumentChunk)
    .sort((a: DocumentChunk, b: DocumentChunk) => a.chunkIndex - b.chunkIndex);
}

export async function listExtractedFieldsByDocumentIdFromFirestore(documentId: string): Promise<ExtractedField[]> {
  const db = getDbOrNull();
  if (!db) {
    return [];
  }

  const snapshot = await db.collection("extracted_fields").where("documentId", "==", documentId).get();
  return snapshot.docs.map((doc) => doc.data() as ExtractedField);
}

export async function listExtractedEntitiesByDocumentIdFromFirestore(documentId: string): Promise<ExtractedEntity[]> {
  const db = getDbOrNull();
  if (!db) {
    return [];
  }

  const snapshot = await db.collection("extracted_entities").where("documentId", "==", documentId).get();
  return snapshot.docs.map((doc) => doc.data() as ExtractedEntity);
}

export async function listAllExtractedEntitiesFromFirestore(type?: string): Promise<ExtractedEntity[]> {
  const db = getDbOrNull();
  if (!db) {
    return [];
  }

  let query = db.collection("extracted_entities");
  if (type) {
    query = query.where("type", "==", type);
  }
  const snapshot = await query.get();
  return snapshot.docs.map((doc) => doc.data() as ExtractedEntity);
}

export interface DocumentFullTextRecord {
  id: string;
  documentId: string;
  fullText: string;
  pageCount: number;
  extractedAt: string;
}

export async function getDocumentFullTextFromFirestore(documentId: string): Promise<DocumentFullTextRecord | null> {
  const db = getDbOrNull();
  if (!db) {
    return null;
  }

  const doc = await db.collection("document_full_text").doc(documentId).get();
  return doc.exists ? (doc.data() as DocumentFullTextRecord) : null;
}

export async function listVerificationTasksFromFirestore(): Promise<VerificationTask[]> {
  const tasks = await readCollection<VerificationTask>("verification_tasks");
  return tasks.sort((a, b) => ensureString(b.createdAt).localeCompare(ensureString(a.createdAt)));
}

async function applyVerificationDecisionInFirestore(
  taskId: string,
  nextStatus: "approved" | "rejected",
  note?: string
): Promise<VerificationTask | null> {
  const db = getDbOrNull();
  if (!db) {
    return null;
  }

  const reviewedAt = nowIso();

  return db.runTransaction(async (tx: FirestoreTransaction) => {
    const taskRef = db.collection("verification_tasks").doc(taskId);
    const taskSnapshot = await tx.get(taskRef);

    if (!taskSnapshot.exists) {
      return null;
    }

    const task = taskSnapshot.data() as VerificationTask;
    if (task.status !== "pending") {
      return null;
    }

    const fieldStatus = nextStatus === "approved" ? "verified" : "rejected";
    const updatedTask: VerificationTask = {
      ...task,
      status: nextStatus,
      reviewedAt
    };
    tx.set(taskRef, updatedTask, { merge: true });

    const docRef = db.collection("documents").doc(task.documentId);
    const docSnapshot = await tx.get(docRef);
    if (docSnapshot.exists) {
      const doc = docSnapshot.data() as DocumentRecord;
      tx.set(
        docRef,
        {
          ...doc,
          verificationStatus: fieldStatus,
          updatedAt: reviewedAt
        },
        { merge: true }
      );
    }

    const fieldsQuery = db.collection("extracted_fields").where("documentId", "==", task.documentId);
    const fieldsSnapshot = await tx.get(fieldsQuery);
    for (const fieldDoc of fieldsSnapshot.docs) {
      const field = fieldDoc.data() as ExtractedField;
      if (!task.fieldIds.includes(field.id)) {
        continue;
      }

      tx.set(
        fieldDoc.ref,
        {
          ...field,
          verificationStatus: fieldStatus,
          reviewerNote: note,
          reviewedAt
        },
        { merge: true }
      );
    }

    const entitiesQuery = db.collection("extracted_entities").where("documentId", "==", task.documentId);
    const entitiesSnapshot = await tx.get(entitiesQuery);
    for (const entityDoc of entitiesSnapshot.docs) {
      const entity = entityDoc.data() as ExtractedEntity;
      tx.set(
        entityDoc.ref,
        {
          ...entity,
          verificationStatus: fieldStatus,
          reviewerNote: note,
          reviewedAt
        },
        { merge: true }
      );
    }

    const eventsQuery = db.collection("clinical_events").where("documentIds", "array-contains", task.documentId);
    const eventsSnapshot = await tx.get(eventsQuery);
    for (const eventDoc of eventsSnapshot.docs) {
      const event = eventDoc.data() as ClinicalEvent;
      tx.set(
        eventDoc.ref,
        {
          ...event,
          verified: nextStatus === "approved"
        },
        { merge: true }
      );
    }

    return updatedTask;
  });
}

export async function approveVerificationTaskInFirestore(
  taskId: string,
  _reviewer: string,
  note?: string
): Promise<VerificationTask | null> {
  return applyVerificationDecisionInFirestore(taskId, "approved", note);
}

export async function rejectVerificationTaskInFirestore(
  taskId: string,
  _reviewer: string,
  note?: string
): Promise<VerificationTask | null> {
  return applyVerificationDecisionInFirestore(taskId, "rejected", note);
}

export async function listTimelineFromFirestore(
  filters: TimelineFilters
): Promise<{ events: ClinicalEvent[]; episodes: ClinicalEpisode[] }> {
  const events = (await readCollection<ClinicalEvent>("clinical_events"))
    .filter((event) => {
      if (filters.from && event.eventDate < filters.from) {
        return false;
      }
      if (filters.to && event.eventDate > filters.to) {
        return false;
      }
      if (filters.condition && !event.conditions.includes(filters.condition.toLowerCase())) {
        return false;
      }
      return true;
    })
    .sort((a, b) => b.eventDate.localeCompare(a.eventDate));

  const episodeIds = new Set(events.map((event) => event.episodeId).filter(Boolean) as string[]);
  const episodes = (await readCollection<ClinicalEpisode>("clinical_episodes")).filter((episode) => episodeIds.has(episode.id));

  return { events, episodes };
}

export async function getDocumentsByIdsFromFirestore(ids: string[]): Promise<DocumentRecord[]> {
  if (ids.length === 0) {
    return [];
  }

  const idSet = new Set(ids);
  const records = await readCollection<DocumentRecord>("documents");
  return records.filter((record) => idSet.has(record.id));
}

export async function getClinicalSnapshotFromFirestore(): Promise<ClinicalSnapshot> {
  const records = await readCollection<DocumentRecord>("documents");
  const events = await readCollection<ClinicalEvent>("clinical_events");

  const verifiedDocs = records.filter((doc) => doc.verificationStatus === "verified");
  const verifiedEvents = events.filter((event) => event.verified);
  const recentEvents = [...events].sort((a, b) => b.eventDate.localeCompare(a.eventDate)).slice(0, 4);

  return {
    generatedAt: nowIso(),
    activeConditions: [
      {
        label: "Systemic condition overview",
        value: "MCAS and thyroid-related symptom management ongoing.",
        sourceDocumentIds: verifiedDocs.slice(0, 1).map((doc) => doc.id)
      }
    ],
    medications: [
      {
        label: "Medication reconciliation",
        value: "Pending verification from 2025 GP and specialist records.",
        sourceDocumentIds: []
      }
    ],
    allergies: [
      {
        label: "Allergy profile",
        value: "Includes MCAS-related sensitivity history, verify latest allergy panel.",
        sourceDocumentIds: records
          .filter((doc) => /allergy/i.test(doc.fileName))
          .slice(0, 1)
          .map((doc) => doc.id)
      }
    ],
    recentCriticalResults: recentEvents
      .filter((event) => event.type === "imaging_result" || event.type === "lab_result")
      .map((event) => ({
        label: event.title,
        value: `${event.summary} (${event.verified ? "verified" : "pending verification"})`,
        sourceDocumentIds: event.documentIds
      }))
      .slice(0, 4),
    recentEvents: recentEvents.map((event) => ({
      label: event.title,
      value: event.summary,
      sourceDocumentIds: event.documentIds
    })),
    upcomingAppointments: [
      {
        label: "No upcoming appointments synced",
        value: "Connect calendar feed or upload appointment confirmation PDFs.",
        sourceDocumentIds: []
      }
    ],
    changesLast30Days: verifiedEvents.slice(0, 2).map((event) => ({
      label: event.title,
      value: event.summary,
      sourceDocumentIds: event.documentIds
    })),
    changesLast90Days: recentEvents.slice(0, 3).map((event) => ({
      label: event.title,
      value: event.summary,
      sourceDocumentIds: event.documentIds
    }))
  };
}

export async function listShareLinksFromFirestore(): Promise<ShareLink[]> {
  const links = await readCollection<ShareLink>("share_links");
  return links.sort((a, b) => ensureString(b.createdAt).localeCompare(ensureString(a.createdAt)));
}

export async function accessShareLinkFromFirestore(
  token: string,
  password: string,
  actor = "provider"
): Promise<{
  ok: boolean;
  reason?: string;
  link?: ShareLink;
}> {
  const db = getDbOrNull();
  if (!db) {
    return { ok: false, reason: "firestore_not_available" };
  }

  const snapshot = await db.collection("share_links").where("token", "==", token).get();
  const link = snapshot.docs.at(0)?.data() as ShareLink | undefined;
  if (!link) {
    void persistAuditLog({
      id: createId("audit"),
      action: "share_link_accessed",
      actor,
      timestamp: nowIso(),
      details: { token, result: "not_found" }
    });
    return { ok: false, reason: "not_found" };
  }

  if (isExpired(link.expiresAt)) {
    void persistAuditLog({
      id: createId("audit"),
      action: "share_link_accessed",
      actor,
      timestamp: nowIso(),
      details: { token, shareLinkId: link.id, result: "expired" }
    });
    return { ok: false, reason: "expired" };
  }

  if (!verifySecret(password, link.passwordHash)) {
    void persistAuditLog({
      id: createId("audit"),
      action: "share_link_accessed",
      actor,
      timestamp: nowIso(),
      details: { token, shareLinkId: link.id, result: "invalid_password" }
    });
    return { ok: false, reason: "invalid_password" };
  }

  void persistAuditLog({
    id: createId("audit"),
    action: "share_link_accessed",
    actor,
    timestamp: nowIso(),
    details: { token, shareLinkId: link.id, result: "ok" }
  });

  return { ok: true, link };
}

export async function listAuditLogsFromFirestore(): Promise<AuditLogEntry[]> {
  const logs = await readCollection<AuditLogEntry>("audit_logs");
  return logs.sort((a, b) => ensureString(b.timestamp).localeCompare(ensureString(a.timestamp)));
}
