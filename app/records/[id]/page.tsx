import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { FieldVerificationList } from "@/components/records/FieldVerificationList";
import {
  getRecordById,
  getDocumentFullText,
  listDocumentChunksByDocumentId,
  listExtractedEntitiesByDocumentId,
  listExtractedFieldsByDocumentId
} from "@/lib/repositories/runtime";

export default async function RecordDetailPage({ params }: { params: Promise<{ id: string }> }): Promise<React.JSX.Element> {
  const { id } = await params;
  const record = await getRecordById(id);
  if (!record) {
    notFound();
  }
  
  // Fetch all document data in parallel
  const [fields, entities, chunks, fullTextRecord] = await Promise.all([
    listExtractedFieldsByDocumentId(record.id),
    listExtractedEntitiesByDocumentId(record.id),
    listDocumentChunksByDocumentId(record.id),
    getDocumentFullText(record.id)
  ]);

  // Group entities by type for better display
  const diagnoses = entities.filter(e => e.type === "diagnosis");
  const labResults = entities.filter(e => e.type === "lab");
  const medications = entities.filter(e => e.type === "medication");
  const procedures = entities.filter(e => e.type === "procedure");
  const keyFindings = entities.filter(e => e.type === "finding");
  const otherEntities = entities.filter(e => 
    !["diagnosis", "lab", "medication", "procedure", "finding"].includes(e.type)
  );

  return (
    <AppShell title="Record Detail" subtitle="Complete document content with extracted clinical data.">
      {/* Header card with metadata */}
      <Card title={record.fileName} detail={`${record.specialty} • ${record.type}`}>
        <div className="grid gap-3 text-sm md:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="font-semibold text-[#64748B]">Event Date</p>
            <p className="text-[#1E293B]">{record.eventDate ? record.eventDate.slice(0, 10) : "Unknown"}</p>
          </div>
          <div>
            <p className="font-semibold text-[#64748B]">Year</p>
            <p className="text-[#1E293B]">{record.year}</p>
          </div>
          <div>
            <p className="font-semibold text-[#64748B]">Provider</p>
            <p className="text-[#1E293B]">{record.provider ?? "Not specified"}</p>
          </div>
          <div>
            <p className="font-semibold text-[#64748B]">Status</p>
            <StatusBadge status={record.verificationStatus} />
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {record.tags.map(tag => (
            <span key={tag} className="rounded-full bg-[#F1F5F9] px-3 py-1 text-xs text-[#475569]">{tag}</span>
          ))}
        </div>
        <div className="mt-4">
          <Link href="/records" className="inline-flex rounded-lg border border-[#BCC6D4] bg-white px-3 py-2 text-sm font-semibold hover:bg-[#F8FAFC]">
            ← Back to records
          </Link>
        </div>
      </Card>

      {/* Clinical summary grid */}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {diagnoses.length > 0 && (
          <Card title="Diagnoses" detail={`${diagnoses.length} found`}>
            <ul className="space-y-2">
              {diagnoses.map((entity) => (
                <li key={entity.id} className="rounded-lg border border-[#E2E8F0] bg-white p-3">
                  <p className="font-medium text-[#1E293B]">{entity.label}</p>
                  {entity.value && <p className="text-sm text-[#64748B]">{entity.value}</p>}
                </li>
              ))}
            </ul>
          </Card>
        )}

        {labResults.length > 0 && (
          <Card title="Lab Results" detail={`${labResults.length} found`}>
            <ul className="space-y-2">
              {labResults.map((entity) => (
                <li key={entity.id} className="rounded-lg border border-[#E2E8F0] bg-white p-3">
                  <div className="flex justify-between">
                    <p className="font-medium text-[#1E293B]">{entity.label}</p>
                    <p className="font-mono text-[#1E293B]">{entity.value}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {medications.length > 0 && (
          <Card title="Medications" detail={`${medications.length} found`}>
            <ul className="space-y-2">
              {medications.map((entity) => (
                <li key={entity.id} className="rounded-lg border border-[#E2E8F0] bg-white p-3">
                  <p className="font-medium text-[#1E293B]">{entity.label}</p>
                  {entity.value && <p className="text-sm text-[#64748B]">{entity.value}</p>}
                </li>
              ))}
            </ul>
          </Card>
        )}

        {keyFindings.length > 0 && (
          <Card title="Key Findings" detail={`${keyFindings.length} found`}>
            <ul className="space-y-2">
              {keyFindings.map((entity) => (
                <li key={entity.id} className="rounded-lg border border-[#FEF3C7] bg-[#FFFBEB] p-3">
                  <p className="font-medium text-[#92400E]">{entity.label}</p>
                  {entity.value && <p className="text-sm text-[#B45309]">{entity.value}</p>}
                </li>
              ))}
            </ul>
          </Card>
        )}

        {procedures.length > 0 && (
          <Card title="Procedures" detail={`${procedures.length} found`}>
            <ul className="space-y-2">
              {procedures.map((entity) => (
                <li key={entity.id} className="rounded-lg border border-[#E2E8F0] bg-white p-3">
                  <p className="font-medium text-[#1E293B]">{entity.label}</p>
                  {entity.value && <p className="text-sm text-[#64748B]">{entity.value}</p>}
                </li>
              ))}
            </ul>
          </Card>
        )}

        {fields.length > 0 && (
          <Card title="Extracted Fields" detail="Verify fields to update trust status.">
            <FieldVerificationList fields={fields} documentId={record.id} />
          </Card>
        )}

        {otherEntities.length > 0 && (
          <Card title="Other Extracted Data" detail={`${otherEntities.length} items`}>
            <ul className="space-y-2 text-sm">
              {otherEntities.map((entity) => (
                <li key={entity.id} className="rounded-lg border border-[#D1D7E0] bg-white p-3">
                  <p className="font-semibold capitalize">{entity.type.replace(/_/g, " ")}: {entity.label}</p>
                  <p className="text-[#3E4C5C]">{entity.value}</p>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>

      {/* Full document text */}
      <Card 
        className="mt-4" 
        title="Full Document Text" 
        detail={fullTextRecord ? `${fullTextRecord.pageCount} page(s)` : "Preview"}
      >
        {fullTextRecord?.fullText ? (
          <div className="max-h-[600px] overflow-y-auto rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-4">
            <pre className="whitespace-pre-wrap font-mono text-sm text-[#374151]">{fullTextRecord.fullText}</pre>
          </div>
        ) : record.textPreview ? (
          <div className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-4">
            <p className="mb-2 text-xs text-[#64748B]">Preview (first 1000 characters)</p>
            <pre className="whitespace-pre-wrap font-mono text-sm text-[#374151]">{record.textPreview}</pre>
          </div>
        ) : chunks.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs text-[#64748B]">Assembled from {chunks.length} indexed chunks</p>
            {chunks.slice(0, 5).map((chunk) => (
              <div key={chunk.id} className="rounded-lg border border-[#D1D7E0] bg-white p-3">
                <p className="whitespace-pre-wrap text-sm text-[#3E4C5C]">{chunk.text}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-[#5A697B]">No text content available.</p>
        )}
      </Card>
    </AppShell>
  );
}
