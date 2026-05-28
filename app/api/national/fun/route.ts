import { NextResponse } from "next/server";
import { serverApi } from "@/src/api/server";

export async function GET() {
  try {
    const data = await serverApi.getNationalFun();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Service indisponible" }, { status: 502 });
  }
}
