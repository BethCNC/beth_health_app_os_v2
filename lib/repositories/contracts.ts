import type {
  AIAnswerWithCitations,
  AuditLogEntry,
  ClinicalEpisode,
  ClinicalEvent,
  ClinicalSnapshot,
  DocumentChunk,
  DocumentRecord,
  ExtractedEntity,
  ExtractedField,
  ImportJob,
  ShareLink,
  VerificationTask
} from "@/lib/types/domain";
import type { RecordFilters, TimelineFilters } from "@/lib/repositories/store";

export interface AppRepository {
  listImportJobs: () => Promise<ImportJob[]>;
  getImportJobById: (jobId: string) => Promise<ImportJob | null>;
  listRecords: (filters: RecordFilters) => Promise<DocumentRecord[]>;
  getRecordById: (id: string) => Promise<DocumentRecord | null>;
  listDocumentChunksByDocumentId: (documentId: string) => Promise<DocumentChunk[]>;
  listExtractedFieldsByDocumentId: (documentId: string) => Promise<ExtractedField[]>;
  listExtractedEntitiesByDocumentId: (documentId: string) => Promise<ExtractedEntity[]>;
  listVerificationTasks: () => Promise<VerificationTask[]>;
  approveVerificationTask: (taskId: string, reviewer: string, note?: string) => Promise<VerificationTask | null>;
  rejectVerificationTask: (taskId: string, reviewer: string, note?: string) => Promise<VerificationTask | null>;
  listTimeline: (filters: TimelineFilters) => Promise<{ events: ClinicalEvent[]; episodes: ClinicalEpisode[] }>;
  getClinicalSnapshot: () => Promise<ClinicalSnapshot>;
  getDocumentsByIds: (ids: string[]) => Promise<DocumentRecord[]>;
  createShareLink: (input: {
    password: string;
    expiresInDays: number;
    actor: string;
    scope: ShareLink["scope"];
  }) => ShareLink;
  listShareLinks: () => Promise<ShareLink[]>;
  accessShareLink: (token: string, password: string, actor?: string) => Promise<{
    ok: boolean;
    reason?: string;
    link?: ShareLink;
  }>;
  recordAIQuery: (actor: string, details: AIAnswerWithCitations) => void;
  getAuditLogs: () => Promise<AuditLogEntry[]>;
  getDataStoreStatus: () => {
    inMemory: true;
    firestorePersistenceEnabled: boolean;
    firestoreReason?: string;
    readMode: "firestore" | "in_memory";
  };
  runImportJob: typeof import("@/lib/repositories/store").runImportJob;
}
