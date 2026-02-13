import { NextResponse } from "next/server";
import { createShareLinkSchema } from "@/lib/types/api";
import { createShareLink, listShareLinks } from "@/lib/repositories/store";

export async function GET(): Promise<NextResponse> {
  const links = listShareLinks().map((link) => ({
    id: link.id,
    token: link.token,
    expiresAt: link.expiresAt,
    createdAt: link.createdAt,
    scope: link.scope
  }));

  return NextResponse.json({ links, count: links.length });
}

export async function POST(request: Request): Promise<NextResponse> {
  const payload = await request.json().catch(() => null);
  const parsed = createShareLinkSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 });
  }

  const link = createShareLink({
    password: parsed.data.password,
    expiresInDays: parsed.data.expiresInDays,
    actor: parsed.data.initiatedBy,
    scope: parsed.data.scope
  });

  return NextResponse.json(
    {
      id: link.id,
      token: link.token,
      expiresAt: link.expiresAt,
      scope: link.scope
    },
    { status: 201 }
  );
}
