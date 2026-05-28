import { serverApi } from "@/src/api/server";
import { FunClient } from "./FunClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Anecdotes — Statistiques nationales — VilleTracker",
};

export default async function FunPage() {
  let data: any = null;
  try {
    data = await serverApi.getNationalFun();
  } catch {}

  return <FunClient data={data} />;
}
