import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { listRecords, listAllExtractedEntities } from "@/lib/repositories/runtime";
import type { DocumentRecord, ExtractedEntity } from "@/lib/types/domain";

interface ConditionGroup {
  name: string;
  normalizedName: string;
  documents: DocumentRecord[];
  entities: ExtractedEntity[];
  specialties: Set<string>;
  yearRange: { min: number; max: number };
}

function normalizeConditionName(name: string): string {
  const lower = name.toLowerCase().trim();
  
  // Normalize common variations
  if (lower.includes("hashimoto") || lower.includes("thyroid")) return "hashimoto_thyroiditis";
  if (lower.includes("mcas") || lower.includes("mast cell")) return "mcas";
  if (lower.includes("thoracic outlet") || lower.includes("tos")) return "thoracic_outlet_syndrome";
  if (lower.includes("rheumatoid") || lower.includes("ra")) return "rheumatoid_arthritis";
  if (lower.includes("fibromyalgia") || lower.includes("fibro")) return "fibromyalgia";
  if (lower.includes("neuropathy")) return "neuropathy";
  if (lower.includes("raynaud")) return "raynauds";
  if (lower.includes("sjogren") || lower.includes("sjögren")) return "sjogrens";
  if (lower.includes("lupus") || lower.includes("sle")) return "lupus";
  if (lower.includes("eds") || lower.includes("ehlers")) return "ehlers_danlos";
  if (lower.includes("pots") || lower.includes("postural")) return "pots";
  if (lower.includes("gastroparesis")) return "gastroparesis";
  if (lower.includes("ibs") || lower.includes("irritable bowel")) return "ibs";
  
  return lower.replace(/[^a-z0-9]/g, "_").replace(/_+/g, "_");
}

function formatConditionName(normalized: string): string {
  const names: Record<string, string> = {
    hashimoto_thyroiditis: "Hashimoto's Thyroiditis",
    mcas: "Mast Cell Activation Syndrome (MCAS)",
    thoracic_outlet_syndrome: "Thoracic Outlet Syndrome (TOS)",
    rheumatoid_arthritis: "Rheumatoid Arthritis",
    fibromyalgia: "Fibromyalgia",
    neuropathy: "Neuropathy",
    raynauds: "Raynaud's Phenomenon",
    sjogrens: "Sjögren's Syndrome",
    lupus: "Systemic Lupus Erythematosus",
    ehlers_danlos: "Ehlers-Danlos Syndrome",
    pots: "POTS",
    gastroparesis: "Gastroparesis",
    ibs: "Irritable Bowel Syndrome"
  };
  return names[normalized] ?? normalized.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

const conditionIcons: Record<string, string> = {
  hashimoto_thyroiditis: "🦋",
  mcas: "🔥",
  thoracic_outlet_syndrome: "💪",
  rheumatoid_arthritis: "🦴",
  fibromyalgia: "⚡",
  neuropathy: "🧠",
  raynauds: "❄️",
  sjogrens: "💧",
  lupus: "🦎",
  ehlers_danlos: "🔄",
  pots: "💓",
  gastroparesis: "🫃",
  ibs: "🫃"
};

export default async function ConditionsPage(): Promise<React.JSX.Element> {
  // Fetch all records and diagnosis entities
  const [allDocs, diagnosisEntities] = await Promise.all([
    listRecords({}),
    listAllExtractedEntities("diagnosis")
  ]);

  // Build document lookup
  const docById = new Map(allDocs.map(d => [d.id, d]));

  // Group diagnoses by normalized condition name
  const conditionMap = new Map<string, ConditionGroup>();
  
  for (const entity of diagnosisEntities) {
    const normalized = normalizeConditionName(entity.value);
    const doc = docById.get(entity.documentId);
    if (!doc) continue;

    let group = conditionMap.get(normalized);
    if (!group) {
      group = {
        name: entity.value,
        normalizedName: normalized,
        documents: [],
        entities: [],
        specialties: new Set(),
        yearRange: { min: doc.year, max: doc.year }
      };
      conditionMap.set(normalized, group);
    }

    // Avoid duplicate documents
    if (!group.documents.find(d => d.id === doc.id)) {
      group.documents.push(doc);
    }
    group.entities.push(entity);
    group.specialties.add(doc.specialty);
    group.yearRange.min = Math.min(group.yearRange.min, doc.year);
    group.yearRange.max = Math.max(group.yearRange.max, doc.year);
  }

  // Sort conditions by document count
  const conditions = [...conditionMap.values()].sort((a, b) => b.documents.length - a.documents.length);

  // Stats
  const totalConditions = conditions.length;
  const totalMentions = diagnosisEntities.length;
  const uniqueDocs = new Set(diagnosisEntities.map(e => e.documentId)).size;

  return (
    <AppShell 
      title="Conditions" 
      subtitle={`${totalConditions} conditions identified across ${uniqueDocs} documents`}
    >
      {/* Summary stats */}
      <div className="mb-4 grid gap-4 md:grid-cols-4">
        <Card title="Conditions" detail="Unique diagnoses">
          <p className="text-3xl font-semibold text-[#1E293B]">{totalConditions}</p>
        </Card>
        <Card title="Mentions" detail="Total references">
          <p className="text-3xl font-semibold text-[#1E293B]">{totalMentions}</p>
        </Card>
        <Card title="Documents" detail="With diagnoses">
          <p className="text-3xl font-semibold text-[#1E293B]">{uniqueDocs}</p>
        </Card>
        <Card title="Specialties" detail="Involved">
          <p className="text-3xl font-semibold text-[#1E293B]">
            {new Set(conditions.flatMap(c => [...c.specialties])).size}
          </p>
        </Card>
      </div>

      {/* Condition cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {conditions.map((condition) => {
          const icon = conditionIcons[condition.normalizedName] ?? "🩺";
          const displayName = formatConditionName(condition.normalizedName);
          
          return (
            <Card 
              key={condition.normalizedName}
              title={`${icon} ${displayName}`}
              detail={`${condition.documents.length} documents • ${condition.entities.length} mentions`}
            >
              <div className="space-y-3">
                {/* Year range */}
                <p className="text-sm text-[#64748B]">
                  {condition.yearRange.min === condition.yearRange.max 
                    ? `Year: ${condition.yearRange.min}`
                    : `Years: ${condition.yearRange.min} - ${condition.yearRange.max}`
                  }
                </p>

                {/* Specialties involved */}
                <div className="flex flex-wrap gap-1">
                  {[...condition.specialties].slice(0, 4).map(spec => (
                    <span 
                      key={spec} 
                      className="rounded bg-[#F1F5F9] px-2 py-0.5 text-xs text-[#475569] capitalize"
                    >
                      {spec.replace(/_/g, " ")}
                    </span>
                  ))}
                  {condition.specialties.size > 4 && (
                    <span className="text-xs text-[#94A3B8]">
                      +{condition.specialties.size - 4} more
                    </span>
                  )}
                </div>

                {/* Recent documents */}
                <div className="max-h-[150px] space-y-1 overflow-y-auto">
                  {condition.documents.slice(0, 5).map(doc => (
                    <Link
                      key={doc.id}
                      href={`/records/${doc.id}`}
                      className="block truncate rounded bg-[#EEF2FF] px-2 py-1 text-xs text-[#4338CA] hover:bg-[#E0E7FF]"
                    >
                      📄 {doc.fileName} ({doc.year})
                    </Link>
                  ))}
                  {condition.documents.length > 5 && (
                    <p className="text-center text-xs text-[#94A3B8]">
                      +{condition.documents.length - 5} more documents
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
