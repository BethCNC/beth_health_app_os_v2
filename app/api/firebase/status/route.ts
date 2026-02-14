import { NextResponse } from "next/server";
import { getDataStoreStatus } from "@/lib/repositories/runtime";

export async function GET(): Promise<NextResponse> {
  return NextResponse.json(getDataStoreStatus());
}
