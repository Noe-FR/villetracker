import { NextResponse } from "next/server";
import { serverApi } from "@/src/api/server";

export async function GET() {
  try {
    const data = await serverApi.getAvailableYears();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ years: [2020, 2021, 2022, 2023], latest: 2023 });
  }
}
