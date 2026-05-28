import { NextRequest, NextResponse } from "next/server";
import { serverApi } from "@/src/api/server";

export async function GET(req: NextRequest) {
  const indicator = req.nextUrl.searchParams.get("indicator");
  const anneeStr  = req.nextUrl.searchParams.get("annee");
  const annee     = anneeStr ? parseInt(anneeStr) : undefined;

  if (!indicator) {
    try {
      const data = await serverApi.getNationalCartesIndicators();
      return NextResponse.json(data);
    } catch {
      return NextResponse.json({ error: "Service indisponible" }, { status: 502 });
    }
  }

  try {
    const data = await serverApi.getNationalCartes(indicator, annee);
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Service indisponible" }, { status: 502 });
  }
}
