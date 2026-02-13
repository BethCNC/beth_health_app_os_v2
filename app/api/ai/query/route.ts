import { NextResponse } from "next/server";
import { aiQuerySchema } from "@/lib/types/api";
import { answerEvidenceOnlyQuestion } from "@/lib/services/ai-service";

export async function POST(request: Request): Promise<NextResponse> {
  const payload = await request.json().catch(() => null);
  const parsed = aiQuerySchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 });
  }

  const answer = answerEvidenceOnlyQuestion({
    question: parsed.data.question,
    actor: parsed.data.actor
  });

  return NextResponse.json(answer);
}
