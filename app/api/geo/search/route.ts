import { NextRequest, NextResponse } from "next/server";
import { serverApi } from "@/src/api/server";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  const limit = Number(req.nextUrl.searchParams.get("limit") ?? 10);
  try {
    const data = await serverApi.searchCommunes(q, limit);
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: "Service temporairement indisponible" }, { status: 502 });
  }
}
