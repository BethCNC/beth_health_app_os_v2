import type {
  AIAnswerWithCitations,
  AuditLogEntry,
  ClinicalSnapshot,
  DocumentRecord,
  ExtractedField,
  ImportJob,
  ShareLink,
  VerificationTask
} from "@/lib/types/domain";
import type { AppRepository } from "@/lib/repositories/contracts";
import {
  getClinicalSnapshot as getClinicalSnapshotFromMemory,
  getDataStoreStatus as getDataStoreStatusFromMemory,
  getDocumentsByIds as getDocumentsByIdsFromMemory,
  getImportJobById as getImportJobByIdFromMemory,
  getRecordById as getRecordByIdFromMemory,
  listDocumentChunksByDocumentId as listDocumentChunksByDocumentIdFromMemory,
  listExtractedEntitiesByDocumentId as listExtractedEntitiesByDocumentIdFromMemory,
  listExtractedFieldsByDocumentId as listExtractedFieldsByDocumentIdFromMemory,
  listImportJobs as listImportJobsFromMemory,
  listRecords as listRecordsFromMemory,
  listTimeline as listTimelineFromMemory,
  listVerificationTasks as listVerificationTasksFromMemory,
  approveVerificationTask as approveVerificationTaskFromMemory,
  rejectVerificationTask as rejectVerificationTaskFromMemory,
  approveField as approveFieldFromMemory,
  rejectField as rejectFieldFromMemory,
  runImportJob,
  createShareLink as createShareLinkInMemory,
  listShareLinks as listShareLinksInMemory,
  accessShareLink as accessShareLinkInMemory,
  recordAIQuery as recordAIQueryInMemory,
  getAuditLogs as getAuditLogsInMemory
} from "@/lib/repositories/store";
import type { RecordFilters, TimelineFilters } from "@/lib/repositories/store";
import { getFirestorePersistenceStatus } from "@/lib/repositories/firestore-persistence";
import {
  approveVerificationTaskInFirestore,
  accessShareLinkFromFirestore,
  getClinicalSnapshotFromFirestore,
  getDocumentsByIdsFromFirestore,
  getDocumentFullTextFromFirestore,
  getImportJobByIdFromFirestore,
  getRecordByIdFromFirestore,
  listAuditLogsFromFirestore,
  listAllExtractedEntitiesFromFirestore,
  listDocumentChunksByDocumentIdFromFirestore,
  listExtractedEntitiesByDocumentIdFromFirestore,
  listExtractedFieldsByDocumentIdFromFirestore,
  listImportJobsFromFirestore,
  listRecordsFromFirestore,
  listShareLinksFromFirestore,
  listTimelineFromFirestore,
  listVerificationTasksFromFirestore,
  rejectVerificationTaskInFirestore
} from "@/lib/repositories/firestore-read";
export type { DocumentFullTextRecord } from "@/lib/repositories/firestore-read";

interface RuntimeMode {
  useFirestoreReads: boolean;
  reason?: string;
}

function getRuntimeMode(): RuntimeMode {
  const persistence = getFirestorePersistenceStatus();
  return {
    useFirestoreReads: persistence.enabled,
    reason: persistence.reason
  };
}

async function withReadFallback<T>(
  firestoreLoader: () => Promise<T>,
  inMemoryLoader: () => T,
  options?: { fallbackOnError?: boolean }
): Promise<T> {
  const mode = getRuntimeMode();
  if (!mode.useFirestoreReads) {
    return inMemoryLoader();
  }

  try {
    return await firestoreLoader();
  } catch {
    if (options?.fallbackOnError === false) {
      throw new Error("firestore_read_failed");
    }
    return inMemoryLoader();
  }
}

export async function listImportJobs(): Promise<ImportJob[]> {
  return withReadFallback(() => listImportJobsFromFirestore(), () => listImportJobsFromMemory());
}

export async function getImportJobById(jobId: string): Promise<ImportJob | null> {
  return withReadFallback(() => getImportJobByIdFromFirestore(jobId), () => getImportJobByIdFromMemory(jobId));
}

export async function listRecords(filters: RecordFilters): Promise<DocumentRecord[]> {
  return withReadFallback(() => listRecordsFromFirestore(filters), () => listRecordsFromMemory(filters));
}

export async function getRecordById(id: string): Promise<DocumentRecord | null> {
  return withReadFallback(() => getRecordByIdFromFirestore(id), () => getRecordByIdFromMemory(id));
}

export async function listDocumentChunksByDocumentId(documentId: string) {
  return withReadFallback(
    () => listDocumentChunksByDocumentIdFromFirestore(documentId),
    () => listDocumentChunksByDocumentIdFromMemory(documentId)
  );
}

export async function listExtractedFieldsByDocumentId(documentId: string) {
  return withReadFallback(
    () => listExtractedFieldsByDocumentIdFromFirestore(documentId),
    () => listExtractedFieldsByDocumentIdFromMemory(documentId)
  );
}

export async function listExtractedEntitiesByDocumentId(documentId: string) {
  return withReadFallback(
    () => listExtractedEntitiesByDocumentIdFromFirestore(documentId),
    () => listExtractedEntitiesByDocumentIdFromMemory(documentId)
  );
}

export async function getDocumentFullText(documentId: string) {
  const mode = getRuntimeMode();
  if (!mode.useFirestoreReads) {
    return null; // In-memory store doesn't support this
  }
  return getDocumentFullTextFromFirestore(documentId);
}

export async function listAllExtractedEntities(type?: string) {
  const mode = getRuntimeMode();
  if (!mode.useFirestoreReads) {
    return []; // In-memory store doesn't support this bulk query
  }
  return listAllExtractedEntitiesFromFirestore(type);
}

export async function listVerificationTasks(): Promise<VerificationTask[]> {
  return withReadFallback(() => listVerificationTasksFromFirestore(), () => listVerificationTasksFromMemory());
}

export async function approveVerificationTask(taskId: string, reviewer: string, note?: string): Promise<VerificationTask | null> {
  return withReadFallback(
    () => approveVerificationTaskInFirestore(taskId, reviewer, note),
    () => approveVerificationTaskFromMemory(taskId, reviewer, note)
  );
}

export async function rejectVerificationTask(taskId: string, reviewer: string, note?: string): Promise<VerificationTask | null> {
  return withReadFallback(
    () => rejectVerificationTaskInFirestore(taskId, reviewer, note),
    () => rejectVerificationTaskFromMemory(taskId, reviewer, note)
  );
}

export async function approveField(fieldId: string, reviewer: string, note?: string): Promise<ExtractedField | null> {
  // Field-level verification currently only uses in-memory store
  // Firestore persistence can be added in future phase
  return approveFieldFromMemory(fieldId, reviewer, note);
}

export async function rejectField(fieldId: string, reviewer: string, note?: string): Promise<ExtractedField | null> {
  // Field-level verification currently only uses in-memory store
  // Firestore persistence can be added in future phase
  return rejectFieldFromMemory(fieldId, reviewer, note);
}

export async function listTimeline(filters: TimelineFilters) {
  return withReadFallback(() => listTimelineFromFirestore(filters), () => listTimelineFromMemory(filters));
}

export async function getClinicalSnapshot(): Promise<ClinicalSnapshot> {
  return withReadFallback(() => getClinicalSnapshotFromFirestore(), () => getClinicalSnapshotFromMemory());
}

export async function getDocumentsByIds(ids: string[]): Promise<DocumentRecord[]> {
  return withReadFallback(() => getDocumentsByIdsFromFirestore(ids), () => getDocumentsByIdsFromMemory(ids));
}

export function createShareLink(input: {
  password: string;
  expiresInDays: number;
  actor: string;
  scope: ShareLink["scope"];
}): ShareLink {
  return createShareLinkInMemory(input);
}

export async function listShareLinks(): Promise<ShareLink[]> {
  return withReadFallback(() => listShareLinksFromFirestore(), () => listShareLinksInMemory());
}

export async function accessShareLink(
  token: string,
  password: string,
  actor = "provider"
): Promise<{
  ok: boolean;
  reason?: string;
  link?: ShareLink;
}> {
  return withReadFallback(
    () => accessShareLinkFromFirestore(token, password, actor),
    () => accessShareLinkInMemory(token, password, actor)
  );
}

export function recordAIQuery(actor: string, details: AIAnswerWithCitations): void {
  recordAIQueryInMemory(actor, details);
}

export async function getAuditLogs(): Promise<AuditLogEntry[]> {
  return withReadFallback(() => listAuditLogsFromFirestore(), () => getAuditLogsInMemory());
}

export function getDataStoreStatus(): {
  inMemory: true;
  firestorePersistenceEnabled: boolean;
  firestoreReason?: string;
  readMode: "firestore" | "in_memory";
} {
  const status = getDataStoreStatusFromMemory();
  const mode = getRuntimeMode();

  return {
    ...status,
    readMode: mode.useFirestoreReads ? "firestore" : "in_memory"
  };
}

export const runtimeRepository: AppRepository = {
  listImportJobs,
  getImportJobById,
  listRecords,
  getRecordById,
  listDocumentChunksByDocumentId,
  listExtractedFieldsByDocumentId,
  listExtractedEntitiesByDocumentId,
  listVerificationTasks,
  approveVerificationTask,
  rejectVerificationTask,
  listTimeline,
  getClinicalSnapshot,
  getDocumentsByIds,
  createShareLink,
  listShareLinks,
  accessShareLink,
  recordAIQuery,
  getAuditLogs,
  getDataStoreStatus,
  runImportJob
};

export { runImportJob };
