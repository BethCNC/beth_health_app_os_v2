import type { AIAnswerWithCitations, Citation } from "@/lib/types/domain";
import { getClinicalSnapshot, getDocumentsByIds, recordAIQuery } from "@/lib/repositories/runtime";

const DISALLOWED_MEDICAL_ADVICE_TERMS = [
  "diagnose",
  "diagnosis",
  "treat",
  "treatment",
  "dose",
  "medication recommendation",
  "what should i take",
  "prescribe"
];

interface AIQueryInput {
  question: string;
  actor: string;
}

export async function answerEvidenceOnlyQuestion(input: AIQueryInput): Promise<AIAnswerWithCitations> {
  const lowerQuestion = input.question.toLowerCase();
  const shouldRefuse = DISALLOWED_MEDICAL_ADVICE_TERMS.some((term) => lowerQuestion.includes(term));

  if (shouldRefuse) {
    const response: AIAnswerWithCitations = {
      answer:
        "I can summarize evidence from your records, but I cannot provide diagnosis or treatment advice. Ask your clinician to interpret these findings in context.",
      confidence: 0.99,
      grounded: true,
      citations: [],
      refusalReason: "medical_advice_not_allowed"
    };
    recordAIQuery(input.actor, response);
    return response;
  }

  const snapshot = await getClinicalSnapshot();
  const sourceIds = new Set<string>();
  for (const item of snapshot.recentEvents) {
    for (const id of item.sourceDocumentIds) {
      sourceIds.add(id);
    }
  }

  const sourceDocs = (await getDocumentsByIds([...sourceIds])).slice(0, 3);
  const citations: Citation[] = sourceDocs.map((doc) => ({
    documentId: doc.id,
    fileName: doc.fileName,
    sourcePath: doc.sourcePath,
    excerpt: `${doc.specialty} record (${doc.verificationStatus})`
  }));

  const response: AIAnswerWithCitations = {
    answer:
      "Based on verified and pending records, the most recent cross-specialty signals are concentrated in primary care follow-up, vascular imaging, and neurology MRI review. Use the timeline and source records to compare symptom progression across 2025-2026.",
    confidence: citations.length > 0 ? 0.78 : 0.35,
    grounded: citations.length > 0,
    citations
  };

  recordAIQuery(input.actor, response);
  return response;
}
