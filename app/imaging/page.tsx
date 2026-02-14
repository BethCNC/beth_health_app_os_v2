import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { listRecords, listAllExtractedEntities } from "@/lib/repositories/runtime";
import type { DocumentRecord } from "@/lib/types/domain";

type BodyRegion = "brain" | "spine" | "chest" | "abdomen" | "pelvis" | "extremities" | "other";

interface ImagingStudy {
  document: DocumentRecord;
  modality: string;
  bodyRegion: BodyRegion;
  diagnoses: string[];
}

function detectModality(type: string, fileName: string): string {
  if (type === "imaging_mri" || fileName.toLowerCase().includes("mri")) return "MRI";
  if (type === "imaging_ct" || fileName.toLowerCase().includes("ct")) return "CT";
  if (type === "imaging_xray" || fileName.toLowerCase().includes("xr ") || fileName.toLowerCase().includes("x-ray")) return "X-Ray";
  if (type === "imaging_ultrasound" || fileName.toLowerCase().includes("ultrasound") || fileName.toLowerCase().includes("us ")) return "Ultrasound";
  if (fileName.toLowerCase().includes("mammogram")) return "Mammogram";
  if (fileName.toLowerCase().includes("emg")) return "EMG";
  if (fileName.toLowerCase().includes("arthrogram")) return "Arthrogram";
  return "Other";
}

function detectBodyRegion(fileName: string, specialty: string): BodyRegion {
  const lower = fileName.toLowerCase();
  const specLower = specialty.toLowerCase();
  
  if (lower.includes("brain") || lower.includes("head") || specLower.includes("neuro")) return "brain";
  if (lower.includes("spine") || lower.includes("cervical") || lower.includes("lumbar") || lower.includes("thoracic") || lower.includes("sacr") || specLower.includes("spinal")) return "spine";
  if (lower.includes("chest") || lower.includes("lung") || lower.includes("cardiac")) return "chest";
  if (lower.includes("abdomen") || lower.includes("abdom") || lower.includes("liver") || lower.includes("kidney") || specLower.includes("gi") || specLower.includes("gastro")) return "abdomen";
  if (lower.includes("pelvi") || lower.includes("hip") || specLower.includes("gyno")) return "pelvis";
  if (lower.includes("shoulder") || lower.includes("hand") || lower.includes("wrist") || lower.includes("knee") || lower.includes("ankle") || lower.includes("extremit") || specLower.includes("ortho")) return "extremities";
  
  return "other";
}

const regionLabels: Record<BodyRegion, string> = {
  brain: "Brain & Head",
  spine: "Spine",
  chest: "Chest",
  abdomen: "Abdomen",
  pelvis: "Pelvis",
  extremities: "Extremities",
  other: "Other"
};

const regionIcons: Record<BodyRegion, string> = {
  brain: "🧠",
  spine: "🦴",
  chest: "🫁",
  abdomen: "🫃",
  pelvis: "🦵",
  extremities: "💪",
  other: "📷"
};

export default async function ImagingPage(): Promise<React.JSX.Element> {
  // Get imaging documents and diagnoses
  const [allDocs, diagnosisEntities] = await Promise.all([
    listRecords({}),
    listAllExtractedEntities("diagnosis")
  ]);

  // Filter to imaging documents
  const imagingDocs = allDocs.filter(d => 
    d.type.includes("imaging") || 
    d.fileName.toLowerCase().includes("mri") ||
    d.fileName.toLowerCase().includes("ct ") ||
    d.fileName.toLowerCase().includes("x-ray") ||
    d.fileName.toLowerCase().includes("xr ") ||
    d.fileName.toLowerCase().includes("ultrasound")
  );

  // Create diagnosis lookup
  const diagnosisByDoc = new Map<string, string[]>();
  for (const entity of diagnosisEntities) {
    const existing = diagnosisByDoc.get(entity.documentId) ?? [];
    existing.push(entity.value);
    diagnosisByDoc.set(entity.documentId, existing);
  }

  // Build imaging studies
  const studies: ImagingStudy[] = imagingDocs.map(doc => ({
    document: doc,
    modality: detectModality(doc.type, doc.fileName),
    bodyRegion: detectBodyRegion(doc.fileName, doc.specialty),
    diagnoses: diagnosisByDoc.get(doc.id) ?? []
  })).sort((a, b) => 
    (b.document.eventDate ?? b.document.createdAt).localeCompare(a.document.eventDate ?? a.document.createdAt)
  );

  // Group by body region
  const byRegion = new Map<BodyRegion, ImagingStudy[]>();
  for (const study of studies) {
    const existing = byRegion.get(study.bodyRegion) ?? [];
    existing.push(study);
    byRegion.set(study.bodyRegion, existing);
  }

  // Group by modality
  const byModality = new Map<string, ImagingStudy[]>();
  for (const study of studies) {
    const existing = byModality.get(study.modality) ?? [];
    existing.push(study);
    byModality.set(study.modality, existing);
  }

  // Stats
  const totalStudies = studies.length;
  const uniqueModalities = byModality.size;

  return (
    <AppShell 
      title="Imaging & Scans" 
      subtitle={`${totalStudies} studies • ${uniqueModalities} modalities`}
    >
      {/* Modality breakdown */}
      <Card className="mb-4" title="By Modality" detail="Study distribution">
        <div className="flex flex-wrap gap-3">
          {[...byModality.entries()]
            .sort((a, b) => b[1].length - a[1].length)
            .map(([modality, studyList]) => (
              <div key={modality} className="rounded-lg border border-[#E2E8F0] bg-white px-4 py-3">
                <p className="text-lg font-semibold text-[#1E293B]">{studyList.length}</p>
                <p className="text-sm text-[#64748B]">{modality}</p>
              </div>
            ))}
        </div>
      </Card>

      {/* Body region cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {(["brain", "spine", "extremities", "chest", "abdomen", "pelvis", "other"] as BodyRegion[]).map(region => {
          const regionStudies = byRegion.get(region) ?? [];
          if (regionStudies.length === 0) return null;
          
          return (
            <Card 
              key={region} 
              title={`${regionIcons[region]} ${regionLabels[region]}`} 
              detail={`${regionStudies.length} ${regionStudies.length === 1 ? "study" : "studies"}`}
            >
              <div className="max-h-[300px] space-y-2 overflow-y-auto">
                {regionStudies.slice(0, 10).map((study) => (
                  <Link
                    key={study.document.id}
                    href={`/records/${study.document.id}`}
                    className="block rounded-lg border border-[#E2E8F0] bg-white p-3 hover:bg-[#F8FAFC]"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-[#1D4ED8]">{study.document.fileName}</p>
                        <p className="text-xs text-[#64748B]">
                          {study.modality} • {study.document.eventDate?.slice(0, 10) ?? study.document.year}
                        </p>
                      </div>
                      <span className="shrink-0 rounded bg-[#F1F5F9] px-2 py-0.5 text-xs text-[#475569]">
                        {study.document.year}
                      </span>
                    </div>
                    {study.diagnoses.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs font-medium text-[#92400E]">
                          {study.diagnoses.length} finding{study.diagnoses.length !== 1 ? "s" : ""}
                        </p>
                      </div>
                    )}
                  </Link>
                ))}
                {regionStudies.length > 10 && (
                  <p className="text-center text-sm text-[#94A3B8]">
                    +{regionStudies.length - 10} more studies
                  </p>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Recent with findings */}
      <Card className="mt-4" title="Recent Studies with Findings" detail="Imaging with documented diagnoses">
        <div className="space-y-3">
          {studies
            .filter(s => s.diagnoses.length > 0)
            .slice(0, 10)
            .map((study) => (
              <Link
                key={study.document.id}
                href={`/records/${study.document.id}`}
                className="flex items-start justify-between gap-4 rounded-lg border border-[#FEF3C7] bg-[#FFFBEB] p-4 hover:bg-[#FEF9C3]"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span>{regionIcons[study.bodyRegion]}</span>
                    <p className="font-medium text-[#1E293B]">{study.document.fileName}</p>
                  </div>
                  <p className="mt-1 text-xs text-[#64748B]">
                    {study.modality} • {study.document.specialty} • {study.document.eventDate?.slice(0, 10)}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {study.diagnoses.slice(0, 3).map((dx, i) => (
                      <span key={i} className="rounded bg-[#FDE68A] px-2 py-0.5 text-xs text-[#92400E]">
                        {dx}
                      </span>
                    ))}
                    {study.diagnoses.length > 3 && (
                      <span className="text-xs text-[#B45309]">+{study.diagnoses.length - 3} more</span>
                    )}
                  </div>
                </div>
                <StatusBadge status={study.document.verificationStatus} />
              </Link>
            ))}
        </div>
      </Card>
    </AppShell>
  );
}
