export type VerificationStatus = "pending" | "verified" | "rejected";

export type DocumentType =
  // Test Results
  | "lab_panel"           // Blood work, metabolic panels, CBC, etc.
  | "lab_single"          // Single lab test result
  | "lab"                 // Legacy: generic lab (pre-classification)
  | "pathology"           // Biopsy results, tissue analysis
  | "genetic_test"        // Genetic/genomic testing results
  // Imaging
  | "imaging_mri"         // MRI scans
  | "imaging_ct"          // CT scans
  | "imaging_xray"        // X-rays
  | "imaging_ultrasound"  // Ultrasound
  | "imaging_other"       // Other imaging (angiogram, EMG, etc.)
  | "imaging"             // Legacy: generic imaging (pre-classification)
  // Clinical Notes
  | "office_visit"        // Regular appointment/follow-up notes
  | "consult_note"        // Specialist consultation
  | "consult"             // Legacy: generic consult
  | "procedure_note"      // Procedure documentation (colonoscopy, etc.)
  | "procedure"           // Legacy: generic procedure
  | "hospital_note"       // Inpatient/ER notes
  | "after_visit_summary" // Patient-facing visit summary
  | "appointment_note"    // Legacy: generic appointment note
  | "summary"             // Legacy: generic summary
  // Communications
  | "referral"            // Referral to another provider
  | "provider_letter"     // Letter between providers
  | "patient_letter"      // Letter to patient
  | "letter"              // Legacy: generic letter
  | "prior_auth"          // Insurance/prior authorization
  // Medications
  | "prescription"        // Prescription/medication order
  | "medication_list"     // Current medications list
  // Unknown
  | "unknown"
  | "other";              // Legacy: other

export type EventType =
  | "lab_result"
  | "imaging_result"
  | "appointment"
  | "flare"
  | "procedure"
  | "note";

export interface DocumentRecord {
  id: string;
  sourcePath: string;
  sourceSystem: "google_drive";
  fileName: string;
  year: number;
  specialty: string;
  provider?: string;
  facility?: string;
  type: DocumentType;
  eventDate?: string;
  tags: string[];
  verificationStatus: VerificationStatus;
  parseStatus?: "not_started" | "parsed" | "failed";
  parseError?: string;
  pageCount?: number;
  textPreview?: string;
  fullText?: string; // Complete word-for-word document content
  ingestionJobId?: string;
  fileSizeBytes?: number;
  modifiedTime?: string;
  indexedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// Full content storage for documents too large for inline storage
export interface DocumentFullText {
  id: string;
  documentId: string;
  fullText: string;
  pageCount: number;
  extractedAt: string;
}

export interface DocumentChunk {
  id: string;
  documentId: string;
  chunkIndex: number;
  text: string;
  tokenCount: number;
  startOffset: number;
  endOffset: number;
  createdAt: string;
}

export type ExtractedEntityType =
  | "diagnosis"
  | "medication"
  | "lab"
  | "allergy"
  | "procedure"
  | "finding"
  | "provider"
  | "appointment"
  | "summary"
  | "unknown";

export interface ExtractedEntity {
  id: string;
  documentId: string;
  type: ExtractedEntityType;
  label: string;
  value: string;
  confidence: number;
  sourceChunkIds: string[];
  verificationStatus: VerificationStatus;
  createdAt: string;
  reviewedAt?: string;
  reviewerNote?: string;
}

export interface ExtractedField {
  id: string;
  documentId: string;
  key: string;
  value: string;
  valueType: "string" | "number" | "date" | "boolean" | "json";
  confidence: number;
  verificationStatus: VerificationStatus;
  reviewerNote?: string;
  reviewedAt?: string;
}

export interface VerificationTask {
  id: string;
  documentId: string;
  fieldIds: string[];
  status: "pending" | "approved" | "rejected";
  priority: "high" | "normal";
  reason: string;
  createdAt: string;
  reviewedAt?: string;
}

export interface ClinicalEvent {
  id: string;
  eventDate: string;
  title: string;
  summary: string;
  type: EventType;
  specialty: string;
  documentIds: string[];
  episodeId?: string;
  conditions: string[];
  verified: boolean;
}

export interface ClinicalEpisode {
  id: string;
  label: string;
  startDate: string;
  endDate?: string;
  conditionFocus: string[];
  eventIds: string[];
  severity: "mild" | "moderate" | "severe";
}

export interface SnapshotSectionItem {
  label: string;
  value: string;
  sourceDocumentIds: string[];
}

export interface ClinicalSnapshot {
  generatedAt: string;
  activeConditions: SnapshotSectionItem[];
  medications: SnapshotSectionItem[];
  allergies: SnapshotSectionItem[];
  recentCriticalResults: SnapshotSectionItem[];
  recentEvents: SnapshotSectionItem[];
  upcomingAppointments: SnapshotSectionItem[];
  changesLast30Days: SnapshotSectionItem[];
  changesLast90Days: SnapshotSectionItem[];
}

export interface ShareLink {
  id: string;
  token: string;
  passwordHash: string;
  expiresAt: string;
  createdAt: string;
  createdBy: string;
  scope: {
    includeDocuments: boolean;
    includeTimeline: boolean;
    includeSnapshot: boolean;
  };
}

export interface Citation {
  documentId: string;
  fileName: string;
  sourcePath: string;
  excerpt?: string;
}

export interface AIAnswerWithCitations {
  answer: string;
  confidence: number;
  grounded: boolean;
  citations: Citation[];
  refusalReason?: string;
}

export interface AuditLogEntry {
  id: string;
  action:
    | "import_backfill"
    | "import_sync"
    | "import_job_created"
    | "import_job_completed"
    | "import_job_failed"
    | "verification_approved"
    | "verification_rejected"
    | "share_link_created"
    | "share_link_accessed"
    | "ai_query";
  actor: string;
  timestamp: string;
  details: Record<string, string | number | boolean | null>;
}

export type ImportJobStatus = "queued" | "processing" | "completed" | "failed";

export type ImportItemStatus = "imported" | "duplicate" | "rejected" | "failed";

export interface ImportJobItem {
  path: string;
  status: ImportItemStatus;
  reason?: string;
  documentId?: string;
  attemptCount?: number;
  retryable?: boolean;
  lastError?: string;
  lastAttemptAt?: string;
}

export interface ImportJobSummary {
  scanned: number;
  accepted: number;
  created: number;
  duplicates: number;
  rejected: number;
  failed: number;
  retryAttempts: number;
  deadLettered: number;
}

export interface ImportDeadLetterItem {
  path: string;
  documentId: string;
  fingerprint: string;
  reason: string;
  retryable: boolean;
  attemptCount: number;
  lastError: string;
  failedAt: string;
}

export interface ImportJob {
  id: string;
  mode: "backfill" | "sync";
  actor: string;
  status: ImportJobStatus;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  summary: ImportJobSummary;
  items: ImportJobItem[];
  errors: string[];
  deadLetters: ImportDeadLetterItem[];
}
