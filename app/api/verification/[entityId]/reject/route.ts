import { NextResponse } from "next/server";
import { verificationActionSchema } from "@/lib/types/api";
import { rejectVerificationTask } from "@/lib/repositories/store";

export async function POST(
  request: Request,
  context: { params: { entityId: string } }
): Promise<NextResponse> {
  const payload = await request.json().catch(() => ({}));
  const parsed = verificationActionSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 });
  }

  const task = rejectVerificationTask(context.params.entityId, parsed.data.reviewer, parsed.data.note);
  if (!task) {
    return NextResponse.json({ error: "Verification task not found" }, { status: 404 });
  }

  return NextResponse.json({ task });
}
