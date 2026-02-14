import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { listRecords, listAllExtractedEntities } from "@/lib/repositories/runtime";
import type { DocumentRecord, ExtractedEntity } from "@/lib/types/domain";

interface SpecialtyGroup {
  specialty: string;
  normalizedName: string;
  documents: DocumentRecord[];
  diagnosisCount: number;
  labCount: number;
  yearRange: { min: number; max: number };
  recentDate: string | null;
}

function normalizeSpecialty(spec: string): string {
  const lower = spec.toLowerCase().trim();
  
  // Normalize variations
  if (lower.includes("ortho") && (lower.includes("surg") || lower === "orthepedic_surgeon" || lower === "orthepedic surgeon")) return "orthopedic_surgery";
  if (lower.includes("ortho") || lower === "orthepedic") return "orthopedic";
  if (lower.includes("spine") || lower.includes("spinal")) return "spine";
  if (lower.includes("hand_specialist") || lower.includes("hand doc")) return "hand_surgery";
  if (lower.includes("gyno") || lower.includes("gyne")) return "gynecology";
  if (lower.includes("eye") || lower.includes("ophth")) return "ophthalmology";
  if (lower === "unknown") return "unknown";
  
  return lower.replace(/[^a-z0-9]/g, "_").replace(/_+/g, "_");
}

function formatSpecialtyName(normalized: string): string {
  const names: Record<string, string> = {
    primary_care: "Primary Care",
    rheumatology: "Rheumatology",
    endocrinology: "Endocrinology",
    immunology_mcas: "Immunology / MCAS",
    orthopedic: "Orthopedics",
    orthopedic_surgery: "Orthopedic Surgery",
    gastroenterology: "Gastroenterology",
    vascular: "Vascular",
    neurology: "Neurology",
    spine: "Spine / Spinal",
    cardiology: "Cardiology",
    gynecology: "Gynecology",
    ophthalmology: "Ophthalmology",
    psychiatry: "Psychiatry",
    hand_surgery: "Hand Surgery",
    unknown: "Unclassified"
  };
  return names[normalized] ?? normalized.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

const specialtyIcons: Record<string, string> = {
  primary_care: "🏥",
  rheumatology: "🦴",
  endocrinology: "🦋",
  immunology_mcas: "🔥",
  orthopedic: "💪",
  orthopedic_surgery: "🔧",
  gastroenterology: "🫃",
  vascular: "🫀",
  neurology: "🧠",
  spine: "🦴",
  cardiology: "❤️",
  gynecology: "👩‍⚕️",
  ophthalmology: "👁️",
  psychiatry: "🧘",
  hand_surgery: "✋",
  unknown: "❓"
};

export default async function SpecialistsPage(): Promise<React.JSX.Element> {
  // Fetch all data
  const [allDocs, diagnosisEntities, labEntities] = await Promise.all([
    listRecords({}),
    listAllExtractedEntities("diagnosis"),
    listAllExtractedEntities("lab")
  ]);

  // Build entity counts by document
  const diagnosisByDoc = new Map<string, number>();
  for (const e of diagnosisEntities) {
    diagnosisByDoc.set(e.documentId, (diagnosisByDoc.get(e.documentId) ?? 0) + 1);
  }
  const labByDoc = new Map<string, number>();
  for (const e of labEntities) {
    labByDoc.set(e.documentId, (labByDoc.get(e.documentId) ?? 0) + 1);
  }

  // Group documents by normalized specialty
  const specialtyMap = new Map<string, SpecialtyGroup>();
  
  for (const doc of allDocs) {
    const normalized = normalizeSpecialty(doc.specialty);
    
    let group = specialtyMap.get(normalized);
    if (!group) {
      group = {
        specialty: doc.specialty,
        normalizedName: normalized,
        documents: [],
        diagnosisCount: 0,
        labCount: 0,
        yearRange: { min: doc.year, max: doc.year },
        recentDate: doc.eventDate ?? null
      };
      specialtyMap.set(normalized, group);
    }

    group.documents.push(doc);
    group.diagnosisCount += diagnosisByDoc.get(doc.id) ?? 0;
    group.labCount += labByDoc.get(doc.id) ?? 0;
    group.yearRange.min = Math.min(group.yearRange.min, doc.year);
    group.yearRange.max = Math.max(group.yearRange.max, doc.year);
    
    // Track most recent date
    const docDate = doc.eventDate ?? `${doc.year}-01-01`;
    if (!group.recentDate || docDate > group.recentDate) {
      group.recentDate = docDate;
    }
  }

  // Sort specialties by document count
  const specialties = [...specialtyMap.values()].sort((a, b) => b.documents.length - a.documents.length);

  // Stats
  const totalSpecialties = specialties.length;
  const totalDocs = allDocs.length;

  return (
    <AppShell 
      title="Specialists" 
      subtitle={`${totalDocs} documents across ${totalSpecialties} specialties`}
    >
      {/* Summary stats */}
      <div className="mb-4 grid gap-4 md:grid-cols-4">
        <Card title="Specialties" detail="Unique areas">
          <p className="text-3xl font-semibold text-[#1E293B]">{totalSpecialties}</p>
        </Card>
        <Card title="Documents" detail="Total records">
          <p className="text-3xl font-semibold text-[#1E293B]">{totalDocs}</p>
        </Card>
        <Card title="Diagnoses" detail="Extracted">
          <p className="text-3xl font-semibold text-[#1E293B]">{diagnosisEntities.length}</p>
        </Card>
        <Card title="Lab Results" detail="Extracted">
          <p className="text-3xl font-semibold text-[#1E293B]">{labEntities.length}</p>
        </Card>
      </div>

      {/* Specialty cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {specialties.map((spec) => {
          const icon = specialtyIcons[spec.normalizedName] ?? "🏥";
          const displayName = formatSpecialtyName(spec.normalizedName);
          
          return (
            <Card 
              key={spec.normalizedName}
              title={`${icon} ${displayName}`}
              detail={`${spec.documents.length} documents`}
            >
              <div className="space-y-3">
                {/* Stats row */}
                <div className="flex gap-4 text-sm">
                  <span className="text-[#92400E]">🩺 {spec.diagnosisCount} diagnoses</span>
                  <span className="text-[#1E40AF]">🧪 {spec.labCount} labs</span>
                </div>

                {/* Year range */}
                <p className="text-sm text-[#64748B]">
                  {spec.yearRange.min === spec.yearRange.max 
                    ? `Year: ${spec.yearRange.min}`
                    : `Years: ${spec.yearRange.min} - ${spec.yearRange.max}`
                  }
                  {spec.recentDate && (
                    <span className="ml-2 text-xs">
                      (Latest: {spec.recentDate.slice(0, 10)})
                    </span>
                  )}
                </p>

                {/* Document type breakdown */}
                <div className="flex flex-wrap gap-1">
                  {(() => {
                    const typeCounts = new Map<string, number>();
                    for (const doc of spec.documents) {
                      const baseType = doc.type.split("_")[0];
                      typeCounts.set(baseType, (typeCounts.get(baseType) ?? 0) + 1);
                    }
                    return [...typeCounts.entries()]
                      .sort((a, b) => b[1] - a[1])
                      .slice(0, 4)
                      .map(([type, count]) => (
                        <span 
                          key={type} 
                          className="rounded bg-[#F1F5F9] px-2 py-0.5 text-xs text-[#475569] capitalize"
                        >
                          {type}: {count}
                        </span>
                      ));
                  })()}
                </div>

                {/* Recent documents */}
                <div className="max-h-[150px] space-y-1 overflow-y-auto">
                  {spec.documents
                    .sort((a, b) => (b.eventDate ?? `${b.year}`).localeCompare(a.eventDate ?? `${a.year}`))
                    .slice(0, 5)
                    .map(doc => (
                      <Link
                        key={doc.id}
                        href={`/records/${doc.id}`}
                        className="block truncate rounded bg-[#EEF2FF] px-2 py-1 text-xs text-[#4338CA] hover:bg-[#E0E7FF]"
                      >
                        📄 {doc.fileName}
                      </Link>
                    ))}
                  {spec.documents.length > 5 && (
                    <p className="text-center text-xs text-[#94A3B8]">
                      +{spec.documents.length - 5} more documents
                    </p>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </AppShell>
  );
}
