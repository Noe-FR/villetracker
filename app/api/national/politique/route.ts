import { NextRequest, NextResponse } from "next/server";
import { serverApi } from "@/src/api/server";

export async function GET(req: NextRequest) {
  const sub = req.nextUrl.searchParams.get("sub") ?? "resume";
  try {
    let data: unknown;
    switch (sub) {
      case "stats-famille":
        data = await serverApi.getNationalPolitiqueStatsFamille();
        break;
      case "evolution":
        data = await serverApi.getNationalPolitiqueEvolution();
        break;
      case "fun":
        data = await serverApi.getNationalPolitiqueFun();
        break;
      case "records":
        data = await serverApi.getNationalPolitiqueRecords();
        break;
      case "elus":
        data = await serverApi.getNationalPolitiqueElus();
        break;
      default:
        data = await serverApi.getNationalPolitiqueResume();
    }
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Service indisponible" }, { status: 502 });
  }
}
