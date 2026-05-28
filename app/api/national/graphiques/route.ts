import { NextRequest, NextResponse } from "next/server";
import { serverApi } from "@/src/api/server";

export async function GET(req: NextRequest) {
  const bloc = req.nextUrl.searchParams.get("bloc") ?? "scores";
  const validBlocs = ["scores", "immo", "eau", "energie", "mobilite", "elections", "fiscalite"];
  if (!validBlocs.includes(bloc)) {
    return NextResponse.json({ error: "Bloc inconnu" }, { status: 400 });
  }
  try {
    const data = await serverApi.getNationalGraphiques(bloc);
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Service indisponible" }, { status: 502 });
  }
}
