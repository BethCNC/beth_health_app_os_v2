import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  getRecordById,
  listDocumentChunksByDocumentId,
  listExtractedEntitiesByDocumentId,
  listExtractedFieldsByDocumentId
} from "@/lib/repositories/store";

export default function RecordDetailPage({ params }: { params: { id: string } }): React.JSX.Element {
  const record = getRecordById(params.id);
  if (!record) {
    notFound();
  }
  const fields = listExtractedFieldsByDocumentId(record.id);
  const entities = listExtractedEntitiesByDocumentId(record.id);
  const chunks = listDocumentChunksByDocumentId(record.id);

  return (
    <AppShell title="Record Detail" subtitle="Source-level metadata and verification status for clinician handoff.">
      <Card title={record.fileName} detail={`${record.specialty} • ${record.type}`}>
        <div className="grid gap-3 text-sm md:grid-cols-2">
          <div>
            <p className="font-semibold">Event date</p>
            <p>{record.eventDate ? record.eventDate.slice(0, 10) : "Unknown"}</p>
          </div>
          <div>
            <p className="font-semibold">Verification</p>
            <StatusBadge status={record.verificationStatus} />
          </div>
          <div className="md:col-span-2">
            <p className="font-semibold">Source path</p>
            <p className="break-all text-[#374151]">{record.sourcePath}</p>
          </div>
          <div>
            <p className="font-semibold">Tags</p>
            <p>{record.tags.join(", ")}</p>
          </div>
          <div>
            <p className="font-semibold">Provider folder</p>
            <p>{record.provider ?? "Not parsed"}</p>
          </div>
          <div>
            <p className="font-semibold">Parse status</p>
            <p>{record.parseStatus ?? "not_started"}</p>
          </div>
          <div>
            <p className="font-semibold">Indexed chunks</p>
            <p>{chunks.length}</p>
          </div>
          <div>
            <p className="font-semibold">File size</p>
            <p>{record.fileSizeBytes ? `${Math.round(record.fileSizeBytes / 1024)} KB` : "Unknown"}</p>
          </div>
          <div>
            <p className="font-semibold">Modified time</p>
            <p>{record.modifiedTime ? new Date(record.modifiedTime).toLocaleString() : "Unknown"}</p>
          </div>
        </div>

        <div className="mt-4">
          <Link href="/records" className="inline-flex rounded-lg border border-[#BCC6D4] bg-white px-3 py-2 font-semibold hover:bg-[#F8FAFC]">
            Back to records
          </Link>
        </div>
      </Card>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card title="Extracted fields" detail="All fields require verification before trust.">
          {fields.length === 0 ? <p className="text-sm text-[#5A697B]">No extracted fields yet.</p> : null}
          <ul className="space-y-2 text-sm">
            {fields.map((field) => (
              <li key={field.id} className="rounded-lg border border-[#D1D7E0] bg-white p-3">
                <p className="font-semibold">{field.key}</p>
                <p className="text-[#3E4C5C]">{field.value}</p>
                <div className="mt-1 flex items-center gap-2 text-xs text-[#5A697B]">
                  <span>confidence {field.confidence.toFixed(2)}</span>
                  <StatusBadge status={field.verificationStatus} />
                </div>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Extracted entities" detail="Heuristic entities from indexed chunks.">
          {entities.length === 0 ? <p className="text-sm text-[#5A697B]">No extracted entities yet.</p> : null}
          <ul className="space-y-2 text-sm">
            {entities.map((entity) => (
              <li key={entity.id} className="rounded-lg border border-[#D1D7E0] bg-white p-3">
                <p className="font-semibold">
                  {entity.type}: {entity.label}
                </p>
                <p className="text-[#3E4C5C]">{entity.value}</p>
                <p className="mt-1 text-xs text-[#5A697B]">chunks: {entity.sourceChunkIds.join(", ") || "none"}</p>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card className="mt-4" title="Indexed text chunks" detail="Chunk preview used for search and RAG grounding.">
        {chunks.length === 0 ? <p className="text-sm text-[#5A697B]">No chunks indexed yet.</p> : null}
        <ul className="space-y-2 text-sm">
          {chunks.slice(0, 8).map((chunk) => (
            <li key={chunk.id} className="rounded-lg border border-[#D1D7E0] bg-white p-3">
              <p className="font-semibold">
                Chunk {chunk.chunkIndex} • tokens {chunk.tokenCount}
              </p>
              <p className="mt-1 whitespace-pre-wrap text-[#3E4C5C]">{chunk.text}</p>
            </li>
          ))}
        </ul>
      </Card>
    </AppShell>
  );
}
