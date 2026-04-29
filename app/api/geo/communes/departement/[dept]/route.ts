import { NextResponse } from "next/server";
import { serverApi, ApiError } from "@/src/api/server";

export async function GET(_req: Request, { params }: { params: Promise<{ dept: string }> }) {
  const { dept } = await params;
  try {
    const data = await serverApi.getCommunesByDept(dept);
    return NextResponse.json(data);
  } catch (e) {
    const status = e instanceof ApiError ? e.status : 502;
    return NextResponse.json({ error: "Service temporairement indisponible" }, { status });
  }
}
