import { NextResponse } from "next/server";
import { serverApi } from "@/src/api/server";

export async function GET(_req: Request, { params }: { params: Promise<{ codeInsee: string }> }) {
  const { codeInsee } = await params;
  try {
    const data = await serverApi.getCommuneGeo(codeInsee);
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 502 });
  }
}
