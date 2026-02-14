import { NextResponse } from "next/server";
import { verificationActionSchema } from "@/lib/types/api";
import { rejectField } from "@/lib/repositories/runtime";

export async function POST(
  request: Request,
  context: { params: { fieldId: string } }
): Promise<NextResponse> {
  const payload = await request.json().catch(() => ({}));
  const parsed = verificationActionSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 });
  }

  const field = await rejectField(context.params.fieldId, parsed.data.reviewer, parsed.data.note);
  if (!field) {
    return NextResponse.json({ error: "Field not found or already reviewed" }, { status: 404 });
  }

  return NextResponse.json({ field });
}
