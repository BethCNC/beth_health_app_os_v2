import type {
  AIAnswerWithCitations,
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
import { createId } from "@/lib/utils/ids";
import { addDays, isExpired, nowIso } from "@/lib/utils/date";
import { hashSecret, verifySecret } from "@/lib/utils/security";
import type { IngestionRejectedFile, NormalizedIngestedDocument } from "@/lib/services/ingestion-service";
import { extractPdfText } from "@/lib/services/pdf-extractor";
import { createTextChunks } from "@/lib/services/text-chunker";
import { inferExtractionCandidates } from "@/lib/services/extraction-heuristics";
import {
  getFirestorePersistenceStatus,
  persistImportPayload,
  persistVerificationArtifacts
} from "@/lib/repositories/firestore-persistence";

interface RecordFilters {
  query?: string;
  type?: string;
  specialty?: string;
  dateFrom?: string;
  dateTo?: string;
}

interface TimelineFilters {
  from?: string;
  to?: string;
  condition?: string;
}

const documents: DocumentRecord[] = [
  {
    id: "doc_seed_gp_2025_01",
    sourcePath:
      "/Health/MEDICAL RECORDS BY YEAR/2025/GP/GP_DR.Kennard_Jan_17_2025_After_Visit_Summary.PDF",
    sourceSystem: "google_drive",
    fileName: "GP_DR.Kennard_Jan_17_2025_After_Visit_Summary.PDF",
    year: 2025,
    specialty: "primary_care",
    provider: "Dr Kennard",
    type: "summary",
    eventDate: "2025-01-17T00:00:00.000Z",
    tags: ["primary_care", "thyroid", "2025"],
    verificationStatus: "verified",
    parseStatus: "parsed",
    pageCount: 1,
    textPreview: "After visit summary with thyroid panel review and symptom progression.",
    indexedAt: nowIso(),
    createdAt: nowIso(),
    updatedAt: nowIso()
  },
  {
    id: "doc_seed_vascular_2025_09",
    sourcePath:
      "/Health/MEDICAL RECORDS BY YEAR/2025/Vascular/MRI Angiogram Chest Sept 12 2025.pdf",
    sourceSystem: "google_drive",
    fileName: "MRI Angiogram Chest Sept 12 2025.pdf",
    year: 2025,
    specialty: "vascular",
    type: "imaging",
    eventDate: "2025-09-12T00:00:00.000Z",
    tags: ["vascular", "imaging", "2025"],
    verificationStatus: "pending",
    parseStatus: "not_started",
    createdAt: nowIso(),
    updatedAt: nowIso()
  },
  {
    id: "doc_seed_mcas_2025_11",
    sourcePath:
      "/Health/MEDICAL RECORDS BY YEAR/2025/MCAS/MCAS Onocology Clinical Notes Nov 2025.pdf",
    sourceSystem: "google_drive",
    fileName: "MCAS Onocology Clinical Notes Nov 2025.pdf",
    year: 2025,
    specialty: "immunology_mcas",
    type: "appointment_note",
    eventDate: "2025-11-10T00:00:00.000Z",
    tags: ["mcas", "immunology_mcas", "2025"],
    verificationStatus: "pending",
    parseStatus: "not_started",
    createdAt: nowIso(),
    updatedAt: nowIso()
  },
  {
    id: "doc_seed_neuro_2026_02",
    sourcePath:
      "/Health/MEDICAL RECORDS BY YEAR/2026/Neurology/MRI_BRAIN_WO_CONTRAST_Feb_10_2026.pdf",
    sourceSystem: "google_drive",
    fileName: "MRI_BRAIN_WO_CONTRAST_Feb_10_2026.pdf",
    year: 2026,
    specialty: "neurology",
    type: "imaging",
    eventDate: "2026-02-10T00:00:00.000Z",
    tags: ["neurology", "imaging", "2026"],
    verificationStatus: "pending",
    parseStatus: "not_started",
    createdAt: nowIso(),
    updatedAt: nowIso()
  }
];

const documentFingerprints = new Set<string>([
  "/health/medical_records_by_year/2025/gp/gp_dr_kennard_jan_17_2025_after_visit_summary",
  "/health/medical_records_by_year/2025/vascular/mri_angiogram_chest_sept_12_2025",
  "/health/medical_records_by_year/2025/mcas/mcas_onocology_clinical_notes_nov_2025",
  "/health/medical_records_by_year/2026/neurology/mri_brain_wo_contrast_feb_10_2026"
]);

const documentChunks: DocumentChunk[] = [
  {
    id: "chunk_seed_gp_1",
    documentId: "doc_seed_gp_2025_01",
    chunkIndex: 0,
    text: "After visit summary with thyroid panel review and symptom progression.",
    tokenCount: 14,
    startOffset: 0,
    endOffset: 68,
    createdAt: nowIso()
  }
];

const extractedEntities: ExtractedEntity[] = [
  {
    id: "entity_seed_gp_1",
    documentId: "doc_seed_gp_2025_01",
    type: "summary",
    label: "Document summary",
    value: "After visit summary with thyroid panel review and symptom progression.",
    confidence: 0.88,
    sourceChunkIds: ["chunk_seed_gp_1"],
    verificationStatus: "verified",
    createdAt: nowIso(),
    reviewedAt: nowIso()
  }
];

const extractedFields: ExtractedField[] = [
  {
    id: "field_seed_condition_1",
    documentId: "doc_seed_gp_2025_01",
    key: "active_condition",
    value: "Suspected MCAS and thyroid dysfunction follow-up",
    valueType: "string",
    confidence: 0.92,
    verificationStatus: "verified",
    reviewedAt: nowIso()
  },
  {
    id: "field_seed_imaging_1",
    documentId: "doc_seed_vascular_2025_09",
    key: "imaging_type",
    value: "MRI angiogram chest",
    valueType: "string",
    confidence: 0.95,
    verificationStatus: "pending"
  },
  {
    id: "field_seed_neuro_1",
    documentId: "doc_seed_neuro_2026_02",
    key: "imaging_type",
    value: "MRI brain without contrast",
    valueType: "string",
    confidence: 0.97,
    verificationStatus: "pending"
  }
];

const verificationTasks: VerificationTask[] = [
  {
    id: "verify_seed_1",
    documentId: "doc_seed_vascular_2025_09",
    fieldIds: ["field_seed_imaging_1"],
    status: "pending",
    priority: "high",
    reason: "New imaging result must be confirmed before snapshot inclusion.",
    createdAt: nowIso()
  },
  {
    id: "verify_seed_2",
    documentId: "doc_seed_neuro_2026_02",
    fieldIds: ["field_seed_neuro_1"],
    status: "pending",
    priority: "high",
    reason: "Neurology imaging imported from 2026 and requires review.",
    createdAt: nowIso()
  }
];

const clinicalEvents: ClinicalEvent[] = [
  {
    id: "event_seed_1",
    eventDate: "2025-01-17T00:00:00.000Z",
    title: "Primary care follow-up",
    summary: "After-visit summary documents symptom progression and thyroid panel review.",
    type: "appointment",
    specialty: "primary_care",
    documentIds: ["doc_seed_gp_2025_01"],
    episodeId: "episode_seed_1",
    conditions: ["mcas", "thyroid"],
    verified: true
  },
  {
    id: "event_seed_2",
    eventDate: "2025-09-12T00:00:00.000Z",
    title: "Vascular MRI angiogram",
    summary: "Chest vascular imaging completed for thoracic outlet syndrome workup.",
    type: "imaging_result",
    specialty: "vascular",
    documentIds: ["doc_seed_vascular_2025_09"],
    episodeId: "episode_seed_2",
    conditions: ["vascular", "tos"],
    verified: false
  },
  {
    id: "event_seed_3",
    eventDate: "2026-02-10T00:00:00.000Z",
    title: "Neurology MRI set",
    summary: "Brain and spine MRI series captured without contrast.",
    type: "imaging_result",
    specialty: "neurology",
    documentIds: ["doc_seed_neuro_2026_02"],
    episodeId: "episode_seed_3",
    conditions: ["neurology"],
    verified: false
  }
];

const clinicalEpisodes: ClinicalEpisode[] = [
  {
    id: "episode_seed_1",
    label: "Endocrine and systemic symptom reassessment",
    startDate: "2025-01-01T00:00:00.000Z",
    endDate: "2025-01-31T00:00:00.000Z",
    conditionFocus: ["mcas", "thyroid"],
    eventIds: ["event_seed_1"],
    severity: "moderate"
  },
  {
    id: "episode_seed_2",
    label: "Vascular/TOS imaging escalation",
    startDate: "2025-09-01T00:00:00.000Z",
    endDate: "2025-10-31T00:00:00.000Z",
    conditionFocus: ["vascular", "tos"],
    eventIds: ["event_seed_2"],
    severity: "moderate"
  },
  {
    id: "episode_seed_3",
    label: "Neurology imaging follow-up",
    startDate: "2026-02-01T00:00:00.000Z",
    conditionFocus: ["neurology"],
    eventIds: ["event_seed_3"],
    severity: "mild"
  }
];

const importJobs: ImportJob[] = [];
const shareLinks: ShareLink[] = [];
const auditLogs: AuditLogEntry[] = [];

function audit(action: AuditLogEntry["action"], actor: string, details: AuditLogEntry["details"]): void {
  auditLogs.unshift({
    id: createId("audit"),
    action,
    actor,
    timestamp: nowIso(),
    details
  });
}

export async function runImportJob(input: {
  mode: "backfill" | "sync";
  actor: string;
  scannedFiles: number;
  accepted: NormalizedIngestedDocument[];
  rejected: IngestionRejectedFile[];
}): Promise<ImportJob> {
  const job: ImportJob = {
    id: createId("job"),
    mode: input.mode,
    actor: input.actor,
    status: "queued",
    createdAt: nowIso(),
    summary: {
      scanned: input.scannedFiles,
      accepted: input.accepted.length,
      created: 0,
      duplicates: 0,
      rejected: input.rejected.length,
      failed: 0
    },
    items: [],
    errors: []
  };

  for (const item of input.rejected) {
    job.items.push({ path: item.path, status: "rejected", reason: item.reason });
  }

  importJobs.unshift(job);
  audit("import_job_created", input.actor, {
    jobId: job.id,
    mode: job.mode,
    scanned: job.summary.scanned,
    accepted: job.summary.accepted,
    rejected: job.summary.rejected
  });

  job.status = "processing";
  job.startedAt = nowIso();

  for (const item of input.accepted) {
    if (documentFingerprints.has(item.fingerprint)) {
      job.summary.duplicates += 1;
      job.items.push({ path: item.record.sourcePath, status: "duplicate", documentId: item.record.id });
      continue;
    }

    try {
      const createdRecord = await indexDocument(item, job.id);
      job.summary.created += 1;
      job.items.push({ path: item.record.sourcePath, status: "imported", documentId: createdRecord.id });
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown_indexing_error";
      job.summary.failed += 1;
      job.errors.push(message);
      job.items.push({ path: item.record.sourcePath, status: "failed", reason: message, documentId: item.record.id });
    }
  }

  job.completedAt = nowIso();
  job.status = job.summary.created > 0 || job.summary.duplicates > 0 ? "completed" : "failed";

  audit(job.status === "completed" ? "import_job_completed" : "import_job_failed", input.actor, {
    jobId: job.id,
    created: job.summary.created,
    duplicates: job.summary.duplicates,
    failed: job.summary.failed,
    mode: job.mode
  });

  audit(job.mode === "backfill" ? "import_backfill" : "import_sync", input.actor, {
    jobId: job.id,
    created: job.summary.created,
    duplicates: job.summary.duplicates,
    failed: job.summary.failed
  });

  const importedDocumentIds = job.items
    .filter((item) => item.status === "imported" && item.documentId)
    .map((item) => item.documentId as string);

  const persisted = await persistImportPayload({
    job,
    documents: documents.filter((doc) => importedDocumentIds.includes(doc.id)),
    chunks: documentChunks.filter((chunk) => importedDocumentIds.includes(chunk.documentId)),
    entities: extractedEntities.filter((entity) => importedDocumentIds.includes(entity.documentId)),
    fields: extractedFields.filter((field) => importedDocumentIds.includes(field.documentId)),
    tasks: verificationTasks.filter((task) => importedDocumentIds.includes(task.documentId)),
    events: clinicalEvents.filter((event) => event.documentIds.some((docId) => importedDocumentIds.includes(docId)))
  });

  if (!persisted.enabled && persisted.reason) {
    job.errors.push(`firestore_persistence_disabled:${persisted.reason}`);
  }

  return job;
}

async function indexDocument(item: NormalizedIngestedDocument, jobId: string): Promise<DocumentRecord> {
  const extraction = await extractPdfText(item.record.sourcePath);
  const sourceText = extraction.text || `${item.record.fileName}\n${item.record.specialty}\n${item.record.tags.join(" ")}`;

  const chunks = createTextChunks(sourceText);
  const chunkIdsByIndex = new Map<number, string>();

  for (const chunk of chunks) {
    const chunkId = createId("chunk");
    chunkIdsByIndex.set(chunk.chunkIndex, chunkId);
    documentChunks.unshift({
      id: chunkId,
      documentId: item.record.id,
      chunkIndex: chunk.chunkIndex,
      text: chunk.text,
      tokenCount: chunk.tokenCount,
      startOffset: chunk.startOffset,
      endOffset: chunk.endOffset,
      createdAt: nowIso()
    });
  }

  const candidates = inferExtractionCandidates({
    document: item.record,
    fullText: sourceText,
    chunks
  });

  const fieldIds: string[] = [];

  for (const candidate of candidates) {
    const sourceChunkIds = candidate.sourceChunkIndexes
      .map((index) => chunkIdsByIndex.get(index))
      .filter((value): value is string => Boolean(value));

    extractedEntities.unshift({
      id: createId("entity"),
      documentId: item.record.id,
      type: candidate.type,
      label: candidate.label,
      value: candidate.value,
      confidence: candidate.confidence,
      sourceChunkIds,
      verificationStatus: "pending",
      createdAt: nowIso()
    });

    const fieldId = createId("field");
    fieldIds.push(fieldId);
    extractedFields.unshift({
      id: fieldId,
      documentId: item.record.id,
      key: candidate.fieldKey,
      value: candidate.value,
      valueType: candidate.valueType,
      confidence: candidate.confidence,
      verificationStatus: "pending"
    });
  }

  if (fieldIds.length === 0) {
    const fallbackFieldId = createId("field");
    fieldIds.push(fallbackFieldId);
    extractedFields.unshift({
      id: fallbackFieldId,
      documentId: item.record.id,
      key: "document_summary",
      value: item.record.fileName,
      valueType: "string",
      confidence: 0.5,
      verificationStatus: "pending"
    });
  }

  const now = nowIso();
  const indexedRecord: DocumentRecord = {
    ...item.record,
    ingestionJobId: jobId,
    parseStatus: extraction.error ? "failed" : "parsed",
    parseError: extraction.error,
    pageCount: extraction.pageCount,
    textPreview: sourceText.slice(0, 220),
    indexedAt: now,
    updatedAt: now
  };

  documents.unshift(indexedRecord);
  documentFingerprints.add(item.fingerprint);

  verificationTasks.unshift({
    id: createId("verify"),
    documentId: indexedRecord.id,
    fieldIds,
    status: "pending",
    priority: "high",
    reason: "All extracted fields require manual verification before trust.",
    createdAt: now
  });

  clinicalEvents.unshift({
    id: createId("event"),
    eventDate: indexedRecord.eventDate ?? indexedRecord.createdAt,
    title: indexedRecord.fileName,
    summary: indexedRecord.textPreview ?? `Imported ${indexedRecord.type.replace("_", " ")} record.`,
    type:
      indexedRecord.type === "lab"
        ? "lab_result"
        : indexedRecord.type === "imaging"
          ? "imaging_result"
          : indexedRecord.type === "appointment_note"
            ? "appointment"
            : "note",
    specialty: indexedRecord.specialty,
    documentIds: [indexedRecord.id],
    conditions: indexedRecord.tags,
    verified: false
  });

  return indexedRecord;
}

export function listImportJobs(): ImportJob[] {
  return [...importJobs].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getImportJobById(jobId: string): ImportJob | null {
  return importJobs.find((job) => job.id === jobId) ?? null;
}

export function listRecords(filters: RecordFilters): DocumentRecord[] {
  const query = filters.query?.toLowerCase().trim();
  const chunkMatchDocIds =
    query && query.length > 0
      ? new Set(
          documentChunks
            .filter((chunk) => chunk.text.toLowerCase().includes(query))
            .map((chunk) => chunk.documentId)
        )
      : null;

  return documents
    .filter((record) => {
      if (filters.type && record.type !== filters.type) {
        return false;
      }
      if (filters.specialty && record.specialty !== filters.specialty) {
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

export function getRecordById(id: string): DocumentRecord | null {
  return documents.find((record) => record.id === id) ?? null;
}

export function listDocumentChunksByDocumentId(documentId: string): DocumentChunk[] {
  return documentChunks
    .filter((chunk) => chunk.documentId === documentId)
    .sort((a, b) => a.chunkIndex - b.chunkIndex);
}

export function listExtractedFieldsByDocumentId(documentId: string): ExtractedField[] {
  return extractedFields.filter((field) => field.documentId === documentId);
}

export function listExtractedEntitiesByDocumentId(documentId: string): ExtractedEntity[] {
  return extractedEntities.filter((entity) => entity.documentId === documentId);
}

export function listVerificationTasks(): VerificationTask[] {
  return [...verificationTasks].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function approveVerificationTask(taskId: string, reviewer: string, note?: string): VerificationTask | null {
  const task = verificationTasks.find((item) => item.id === taskId && item.status === "pending");
  if (!task) {
    return null;
  }

  task.status = "approved";
  task.reviewedAt = nowIso();

  const doc = documents.find((item) => item.id === task.documentId);
  if (doc) {
    doc.verificationStatus = "verified";
    doc.updatedAt = nowIso();
  }

  for (const fieldId of task.fieldIds) {
    const field = extractedFields.find((item) => item.id === fieldId);
    if (!field) {
      continue;
    }
    field.verificationStatus = "verified";
    field.reviewerNote = note;
    field.reviewedAt = task.reviewedAt;
  }

  for (const entity of extractedEntities.filter((item) => item.documentId === task.documentId)) {
    entity.verificationStatus = "verified";
    entity.reviewedAt = task.reviewedAt;
    entity.reviewerNote = note;
  }

  for (const event of clinicalEvents.filter((item) => item.documentIds.includes(task.documentId))) {
    event.verified = true;
  }

  void persistVerificationArtifacts({
    documentId: task.documentId,
    document: doc ?? undefined,
    fields: extractedFields.filter((item) => item.documentId === task.documentId),
    entities: extractedEntities.filter((item) => item.documentId === task.documentId),
    task,
    events: clinicalEvents.filter((item) => item.documentIds.includes(task.documentId))
  });

  audit("verification_approved", reviewer, { taskId, documentId: task.documentId });
  return task;
}

export function rejectVerificationTask(taskId: string, reviewer: string, note?: string): VerificationTask | null {
  const task = verificationTasks.find((item) => item.id === taskId && item.status === "pending");
  if (!task) {
    return null;
  }

  task.status = "rejected";
  task.reviewedAt = nowIso();

  const doc = documents.find((item) => item.id === task.documentId);
  if (doc) {
    doc.verificationStatus = "rejected";
    doc.updatedAt = nowIso();
  }

  for (const fieldId of task.fieldIds) {
    const field = extractedFields.find((item) => item.id === fieldId);
    if (!field) {
      continue;
    }
    field.verificationStatus = "rejected";
    field.reviewerNote = note;
    field.reviewedAt = task.reviewedAt;
  }

  for (const entity of extractedEntities.filter((item) => item.documentId === task.documentId)) {
    entity.verificationStatus = "rejected";
    entity.reviewedAt = task.reviewedAt;
    entity.reviewerNote = note;
  }

  void persistVerificationArtifacts({
    documentId: task.documentId,
    document: doc ?? undefined,
    fields: extractedFields.filter((item) => item.documentId === task.documentId),
    entities: extractedEntities.filter((item) => item.documentId === task.documentId),
    task,
    events: clinicalEvents.filter((item) => item.documentIds.includes(task.documentId))
  });

  audit("verification_rejected", reviewer, { taskId, documentId: task.documentId });
  return task;
}

export function listTimeline(filters: TimelineFilters): { events: ClinicalEvent[]; episodes: ClinicalEpisode[] } {
  const events = clinicalEvents
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
  const episodes = clinicalEpisodes.filter((episode) => episodeIds.has(episode.id));

  return { events, episodes };
}

export function getClinicalSnapshot(): ClinicalSnapshot {
  const verifiedDocs = documents.filter((doc) => doc.verificationStatus === "verified");
  const verifiedEvents = clinicalEvents.filter((event) => event.verified);
  const recentEvents = [...clinicalEvents].sort((a, b) => b.eventDate.localeCompare(a.eventDate)).slice(0, 4);

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
        sourceDocumentIds: documents
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

export function createShareLink(input: {
  password: string;
  expiresInDays: number;
  actor: string;
  scope: ShareLink["scope"];
}): ShareLink {
  const createdAt = nowIso();
  const link: ShareLink = {
    id: createId("share"),
    token: createId("token"),
    passwordHash: hashSecret(input.password),
    expiresAt: addDays(new Date(), input.expiresInDays).toISOString(),
    createdAt,
    createdBy: input.actor,
    scope: input.scope
  };

  shareLinks.unshift(link);
  audit("share_link_created", input.actor, {
    shareLinkId: link.id,
    expiresAt: link.expiresAt
  });

  return link;
}

export function listShareLinks(): ShareLink[] {
  return [...shareLinks].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function accessShareLink(token: string, password: string, actor = "provider"): {
  ok: boolean;
  reason?: string;
  link?: ShareLink;
} {
  const link = shareLinks.find((item) => item.token === token);
  if (!link) {
    return { ok: false, reason: "not_found" };
  }

  if (isExpired(link.expiresAt)) {
    return { ok: false, reason: "expired" };
  }

  if (!verifySecret(password, link.passwordHash)) {
    return { ok: false, reason: "invalid_password" };
  }

  audit("share_link_accessed", actor, { shareLinkId: link.id, token: link.token });
  return { ok: true, link };
}

export function recordAIQuery(actor: string, details: AIAnswerWithCitations): void {
  audit("ai_query", actor, {
    grounded: details.grounded,
    confidence: details.confidence,
    citations: details.citations.length
  });
}

export function getAuditLogs(): AuditLogEntry[] {
  return [...auditLogs];
}

export function getDataStoreStatus(): {
  inMemory: true;
  firestorePersistenceEnabled: boolean;
  firestoreReason?: string;
} {
  const persistence = getFirestorePersistenceStatus();
  return {
    inMemory: true,
    firestorePersistenceEnabled: persistence.enabled,
    firestoreReason: persistence.reason
  };
}

export function getDocumentsByIds(ids: string[]): DocumentRecord[] {
  const idSet = new Set(ids);
  return documents.filter((doc) => idSet.has(doc.id));
}
