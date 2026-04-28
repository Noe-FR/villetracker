import { NextRequest, NextResponse } from "next/server";
import { serverApi } from "@/src/api/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ idMutation: string }> }
) {
  const { idMutation } = await params;
  try {
    const data = await serverApi.getDvfTransactionDetail(idMutation);
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 502 });
  }
}
