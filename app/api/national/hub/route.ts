import { NextRequest, NextResponse } from "next/server";
import { serverApi } from "@/src/api/server";

export async function GET(req: NextRequest) {
  const sub = req.nextUrl.searchParams.get("sub") ?? "hub";
  try {
    let data: unknown;
    switch (sub) {
      case "anniversaires":
        data = await serverApi.getNationalHubAnniversaires();
        break;
      case "evolution-finances":
        data = await serverApi.getNationalHubEvolutionFinances();
        break;
      case "notes-distribution":
        data = await serverApi.getNationalHubNotesDistribution();
        break;
      default:
        data = await serverApi.getNationalHub();
    }
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Service indisponible" }, { status: 502 });
  }
}
